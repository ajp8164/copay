'use strict';
angular.module('copayApp.services').factory('posPaymentService', function($rootScope, $state, $timeout, $interval, $log, configService, walletService, txStatus, fingerprintService, bitcore, gettextCatalog) {

    var root = {};

    var _countDown;
    var _paymentExpired = false;
    var _paypro = null;
    var _remainingTimeStr = '';

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
      // TODO: getting payment uri from the notification is temporary, need to get it from a service.
      root.message = data.message;
      root.paymentUri = data.additionalData.paymentUri;

      // Can't use go(), creates a circular dependency.
      $state.transitionTo('posPayment');
    };

    root.makePayment = function(client, uri, cb, sayStatus) {
      sayStatus(gettextCatalog.getString('Fetching payment information'));
      _getFromUri(client, uri, function(err, addr, amount, message) {
        if (err) {
          cb(err);
        }
        sayStatus(gettextCatalog.getString('Sending payment'));
        _makePayment(client, addr, amount, message, function(err) {
          if (err) {
            cb(err);
          }
          sayStatus();
          cb();
        });
      });

    };
    
    function _getFromUri(client, uri, cb) {
      var config = configService.getSync();
      var unitToSatoshi = config.wallet.settings.unitToSatoshi;
      var unitDecimals = config.wallet.settings.unitDecimals;
      var satToUnit = 1 / unitToSatoshi;

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
        _getPayPro(client, uri, function(err, paypro) {
          if (err) {
            return cb(err);
          }
          _paypro = paypro;
          return cb(null, paypro.toAddress, (paypro.amount * satToUnit).toFixed(unitDecimals), paypro.memo);
        });
      } else {
        uri = sanitizeUri(uri);

        if (!bitcore.URI.isValid(uri)) {
          return cb('Invalid payment URI: ' + uri);
        }

        var parsed = new bitcore.URI(uri);
        var addr = parsed.address ? parsed.address.toString() : '';
        var message = parsed.message;
        var amount = parsed.amount ? (parsed.amount.toFixed(0) * satToUnit).toFixed(unitDecimals) : 0;

        if (parsed.r) {
          _getPayPro(client, parsed.r, function(err, paypro) {
            if (err && addr && amount) {
              return cb(null, addr, amount, message);
            }
            _paypro = paypro;
            return cb(null, paypro.toAddress, (paypro.amount * satToUnit).toFixed(unitDecimals), paypro.memo);
          });
        } else {
          return cb(null, addr, amount, message);
        }
      }
    };

    function _getPayPro(client, uri, cb) {
      $log.debug('Fetch PayPro Request...', uri);
      $timeout(function() {
        client.fetchPayPro({
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

          if (!paypro.verified) {
            $log.warn('Failed to verify payment protocol signatures');
            var msg = gettext('Payment Protocol Invalid');
            return cb(msg);
          }

          _paymentTimeControl(paypro.expires);
          return cb(null, paypro);
        });
      });

    };

    function _paymentTimeControl(expirationTime) {
      _paymentExpired = false;
      setExpirationTime();

      _countDown = $interval(function() {
        setExpirationTime();
      }, 1000);

      function setExpirationTime() {
        var now = Math.floor(Date.now() / 1000);
        if (now > expirationTime) {
          setExpiredValues();
          return;
        }

        var totalSecs = expirationTime - now;
        var m = Math.floor(totalSecs / 60);
        var s = totalSecs % 60;
        _remainingTimeStr = ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
      };

      function setExpiredValues() {
        _paymentExpired = true;
        _remainingTimeStr = null;
        _paypro = null;
        if (_countDown) $interval.cancel(_countDown);
      };
    };

    function _makePayment(client, address, amount, message, cb) {
      var config = configService.getSync();
      var unitToSatoshi = config.wallet.settings.unitToSatoshi;

      amount = parseInt((amount * unitToSatoshi).toFixed(0));

      var outputs = [];
      outputs.push({
        'toAddress': address,
        'amount': amount,
        'message': message
      });

      var txp = {};
      txp.toAddress = address;
      txp.amount = amount;
      txp.outputs = outputs;
      txp.message = message;
      txp.payProUrl = _paypro ? _paypro.url : null;
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
