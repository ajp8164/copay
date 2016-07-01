'use strict';
angular.module('copayApp.services').factory('posPaymentService', function($rootScope, $state, $timeout, $interval, $log, $q, lodash, configService, walletService, txStatus, fingerprintService, bitcore, bwcService, bpcService, pushNotificationsService, gettextCatalog) {

    var root = {};

    var _bitpay = bpcService.getClient();
    var _bwc = bwcService.getClient();

    var _error = undefined;
    var _pendingPayments = [];

    // 
    // data.additionalData.paymentUri is a BIP73 payment URI
    // Example: https://bitpay.com/i/Eq46exwzTfDd1kaUdWqgL7
    // 
    // iOS data payload example for Node Push Server:
    /*
      {
         "badge": 1,
         "alert": {
           "title": "Payment Request",
           "body": "Amazon checkout for $542.17",
           "action-loc-key": "Pay"
         },
         "sound": "soundName",
         "payload": {
           "posPayment": true,
           "paymentUri": "bitcoin:?r=https://bitpay.com/i/Eq46exwzTfDd1kaUdWqgL7"
         }
       }
    */
    // 
    // Handle a POS payment notification (a push service request).
    root.handlePosPaymentNotification = function(data) {
      $log.info('POS payment notification received: ' + data.message);

      _error = undefined;
      _pendingPayments = [];

      var opts = {
        deviceToken: pushNotificationsService.token
      };

      _bitpay.getNotifiedInvoices(opts, function(err, response) {
        if (err) {
          _error = 'Could not get payment information from Bitpay.';
          $log.error(_error + ': ' + err.message);
        } else {

          $log.debug('Pending invoices received from BitPay: ' + JSON.stringify(response.paymentUrls));

          // Get payment information from the paypro uris.
          // More than one pending payment may be returned, we let the user choose which to pay.
          var fetched = 0;
          for (var i = 0; i < response.paymentUrls.length; i++) {
            // Avoid caching the pending payment more than once.
            var index = lodash.findIndex(_pendingPayments, function(pendingPayment) {
              return pendingPayment.uri == response.paymentUrls[i];
            });

            if (index >= 0) {
              continue;
            }

            _getFromUri(response.paymentUrls[i], function(err, paypro) {
              if (err) {
                _error = 'Could not get payment information from Bitpay.';
                $log.error(_error + ': ' + err.message);
              } else {
                _pendingPayments.push(paypro);
              }
              
              // After fetching all payment details present the view.
              if (++fetched == response.paymentUrls.length) {
                $log.debug('Pending Payments: ' + JSON.stringify(_pendingPayments));
                $state.transitionTo('posPayment');
              }
            });
          }
        }
      });
    };

    root.getError = function() {
      return _error;
    };

    root.getPendingPayments = function() {
      return _pendingPayments;
    };

    root.makePayment = function(client, paypro, cb, sayStatus) {
      sayStatus(gettextCatalog.getString('Sending payment'));
      _makePayment(client, paypro, function(err) {
        if (err) {
          cb(err);
        }
        sayStatus();
        cb();
      });
    };
    
    function _getFromUri(uri, cb) {
      function sanitizeUri(uri) {
        // Fixes when a region uses comma to separate decimals
        var regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
        var match = regex.exec(uri);
        if (!match || match.length === 0) {
          return uri;
        }
        var value = match[0].replace(',', '.');
        var newUri = uri.replace(regex, value);
        return newUri;
      };

      // URI extensions for Payment Protocol with non-backwards-compatible request
      if ((/^bitcoin:\?r=[\w+]/).exec(uri)) {
        uri = decodeURIComponent(uri.replace('bitcoin:?r=', ''));
        _getPayPro(uri, function(err, paypro) {
          if (err) {
            return cb(err);
          }
          return cb(null, paypro);
        });
      } else {
        uri = sanitizeUri(uri);

        if (!bitcore.URI.isValid(uri)) {
          return cb('Invalid payment URI: ' + uri);
        }

        var parsed = new bitcore.URI(uri);

        if (parsed.r) {
          _getPayPro(parsed.r, function(err, paypro) {
            if (err) {
              return cb(err);
            }
            return cb(null, paypro);
          });
        } else {
          return cb('Invalid URI: require payment protocol endpoint.');
        }
      }
    };

    function _getPayPro(uri, cb) {
      var config = configService.getSync();
      var unitToSatoshi = config.wallet.settings.unitToSatoshi;
      var unitDecimals = config.wallet.settings.unitDecimals;
      var satToUnit = 1 / unitToSatoshi;

      $log.debug('Fetch PayPro Request...', uri);
      $timeout(function() {
        _bwc.fetchPayPro({
          payProUrl: uri,
        }, function(err, paypro) {

          if (err) {
            $log.warn('Could not fetch payment request:', err);
            var msg = err.toString();
            if (msg.match('HTTP')) {
              msg = gettext('Could not fetch payment information');
            }
            return cb(msg);
          }
/*
TODO: defeat for testing only
          if (!paypro.verified) {
            $log.warn('Failed to verify payment protocol signatures');
            var msg = gettext('Payment Protocol Invalid');
            return cb(msg);
          }
*/
          paypro.displayAmount = (paypro.amount * satToUnit).toFixed(unitDecimals);
          _paymentTimeControl(paypro);
          return cb(null, paypro);
        });
      });
    };

    function _paymentTimeControl(paypro) {
      paypro.timer = {};
      paypro.timer.isExpired = false;
      setExpirationTime();

      paypro.timer.countDown = $interval(function() {
        setExpirationTime();
      }, 1000);

      function setExpirationTime() {
        var now = Math.floor(Date.now() / 1000);
        if (now > paypro.expires) {
          setExpiredValues();
          return;
        }

        var totalSecs = paypro.expires - now;
        var m = Math.floor(totalSecs / 60);
        var s = totalSecs % 60;
        paypro.timer.remainingTime = ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
      };

      function setExpiredValues() {
        paypro.timer.isExpired = true;
        paypro.timer.remainingTime = null;
        if (paypro.timer.countDown) $interval.cancel(paypro.timer.countDown);
      };
    };

    function _makePayment(client, paypro, cb) {
      var config = configService.getSync();
      var unitToSatoshi = config.wallet.settings.unitToSatoshi;

      amount = parseInt((amount * unitToSatoshi).toFixed(0));

      var outputs = [];
      outputs.push({
        'toAddress': paypro.toAddress,
        'amount': paypro.amount,
        'message': paypro.memo
      });

      var txp = {};
      txp.toAddress = paypro.toAddress;
      txp.amount = paypro.amount;
      txp.outputs = outputs;
      txp.message = paypro.memo;
      txp.payProUrl = paypro.url;
      txp.excludeUnconfirmedUtxos = config.wallet.spendUnconfirmed ? false : true;
      txp.feeLevel = config.wallet.settings.feeLevel || 'normal';

      walletService.createTx(client, txp, function(err, createdTxp) {
        if (err) {
          return cb(err);
        }

        if (!client.canSign() && !client.isPrivKeyExternal()) {
          $log.info('No signing proposal: No private key');
          cb('Cannot pay with transaction proposal');
        } else {
          $rootScope.$emit('Local/NeedsConfirmation', createdTxp, function(accept) {
            if (accept) {
              _confirmTx(client, createdTxp, function(err) {
                if (err) {
                  cb(err);
                }
                // User completed payment.
                cb();
              });
            }
            // User aborted payment.
            cb();
          });
        }
      });
    };

    function _confirmTx(client, txp, cb) {
      fingerprintService.check(client, function(err) {
        if (err) {
          return cb(err);
        }

        handleEncryptedWallet(client, function(err) {
          if (err) {
            return cb(err);
          }

          walletService.publishTx(client, txp, function(err, publishedTxp) {
            if (err) {
              return cb(err);
            }

            walletService.signTx(client, publishedTxp, function(err, signedTxp) {
              walletService.lock(client);
              if (err) {
                $rootScope.$emit('Local/TxProposalAction');
                return cb(err.message ? err.message : gettext('The payment was created but could not be completed. Please try again from home screen'));
              }

              if (signedTxp.status == 'accepted') {
                walletService.broadcastTx(client, signedTxp, function(err, broadcastedTxp) {
                  if (err) {
                    return cb(err);
                  }
                  txStatus.notify(broadcastedTxp, function() {
                    $rootScope.$emit('Local/TxProposalAction', broadcastedTxp.status == 'broadcasted');
                  });
                });
              } else {
                return cb(gettext('Transaction not accepted, you may not pay at POS with a transaction proposal'));
              }
            });
          });
        });
      });
    };

    return root;
  });
