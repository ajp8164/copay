'use strict';

angular.module('copayApp.model').factory('FocusedWallet', function ($rootScope, $log, $timeout, $filter, lodash, isChromeApp, gettext, configService, txStatus, txFormatService, rateService, confirmDialog) {
 
  // Static properties
  // 
  FocusedWallet.bwc = null;
  FocusedWallet.status = null;

  // Listen for wallet client changes and statically cache the Bitcore Wallet Client (bwc) when a change is made.
  // 
  $rootScope.$on('Local/NewFocusedWallet', function(event, bwc) {
    FocusedWallet.bwc = bwc;
  });

  // Listen for balance updates.
  // 
  $rootScope.$on('Local/WalletStatus', function(event, walletStatus) {
    FocusedWallet.status = walletStatus;
  });

  // Constructor
  // See https://medium.com/opinionated-angularjs/angular-model-objects-with-javascript-classes-2e6a067c73bc#.970bxmciz
  // 
  function FocusedWallet() {
    $log.debug('Error: FocusedWallet is a static class and should not be instanced');
  };

  // Static methods
  // 
  FocusedWallet.get = function() {
    return FocusedWallet.bwc;
  };

  FocusedWallet.getWalletId = function() {
    return FocusedWallet.bwc.credentials.walletId;
  };

  FocusedWallet.getInfo = function() {
    return {
      config: configService.getSync().wallet,
      client: FocusedWallet.bwc,
      status: FocusedWallet.status
    };
  };

  FocusedWallet.getBalance = function(kind) {
    if (FocusedWallet.status == null) {
      return null;
    }

    var config = configService.getSync().wallet;
    switch (kind) {
      case ('availableAmount'):
        var availableBalanceSat = FocusedWallet.status.balance.availableConfirmedAmount;
        if (config.spendUnconfirmed) {
          availableBalanceSat = FocusedWallet.status.balance.availableAmount;
        }
        var availableBalanceAlternative = rateService.toFiat(availableBalanceSat, config.settings.alternativeIsoCode);
        availableBalanceAlternative = $filter('noFractionNumber')(availableBalanceAlternative, 2);

        return {
          native: availableBalanceSat,
          alternative: parseInt(availableBalanceAlternative)
        };
        break;
      case ('lockedAmount'):
        var lockedBalanceSat = FocusedWallet.status.balance.lockedConfirmedAmount;
        if (config.spendUnconfirmed) {
          lockedBalanceSat = FocusedWallet.status.balance.lockedAmount;
        }
        var lockedBalanceAlternative = rateService.toFiat(lockedBalanceSat, config.settings.alternativeIsoCode);
        lockedBalanceAlternative = $filter('noFractionNumber')(lockedBalanceAlternative, 2);

        return {
          native: lockedBalanceSat,
          alternative: parseInt(lockedBalanceAlternative)
        };
        break;
      case ('totalAmount'):
        var totalBalanceSat = FocusedWallet.status.balance.totalConfirmedAmount;
        if (config.spendUnconfirmed) {
          totalBalanceSat = FocusedWallet.status.balance.totalAmount;
        }
        var totalBalanceAlternative = rateService.toFiat(totalBalanceSat, config.settings.alternativeIsoCode);
        totalBalanceAlternative = $filter('noFractionNumber')(totalBalanceAlternative, 2);

        return {
          native: totalBalanceSat,
          alternative: parseInt(totalBalanceAlternative)
        };
        break;
      default:
        throw ('Error: unknown balance kind - ' + kind);
    };
  };

  FocusedWallet.getBalanceAsString = function(kind, alternative) {
    var config = configService.getSync().wallet.settings;
    var balance = FocusedWallet.getBalance(kind);
    if (balance == null) {
      return '';
    } else {
      var b = (alternative ? balance.alternative : balance.native);
      var unit = (alternative ? config.alternativeIsoCode : config.unitName);
      return txFormatService.formatAmount(b) + ' ' + unit;
    }
  };

  FocusedWallet.getFee = function(cb) {
    var bwc = FocusedWallet.bwc;
    var config = configService.getSync().wallet.settings;
    var feeLevel = config.feeLevel || 'normal';
    // static fee
    var fee = 10000;
    bwc.getFeeLevels(bwc.credentials.network, function(err, levels) {
      if (err) {
        return cb({message: 'Could not get dynamic fee. Using static 10000sat'}, fee);
      }
      else {
        fee = lodash.find(levels, { level: feeLevel }).feePerKB;
        $log.debug('Dynamic fee: ' + feeLevel + ' ' + fee +  ' SAT');
        return cb(null, fee); 
      }
    });
  }; 

  FocusedWallet.getTransactionData = function(data, cb) {
    var bwc = FocusedWallet.bwc;
    if (data.payProUrl && isChromeApp) {
      return cb(gettext('Payment Protocol not supported on Chrome App'), null);
    }

    if (data.payProUrl) {
      $log.debug('Fetch PayPro Request from ', data.payProUrl);
      $timeout(function() {
        bwc.fetchPayPro({
          payProUrl: data.payProUrl,
        }, function(err, paypro) {

          if (err) {
            $log.warn('Could not fetch payment request:', err);
            var msg = err.toString();
            if (msg.match('HTTP')) {
              msg = gettext('Could not fetch payment information');
            }
            return cb(msg, null);
          }

          if (!paypro.verified) {
            $log.warn('Failed to verified payment protocol signatured');
            return cb(gettext('Payment Protocol Invalid'), null);
          }

          // Prepend the callers memo to the paypro memo.
          if (data.memo) {
            paypro.memo += data.memo + ' ';
          }
          return cb(null, paypro);
        });
      }, 1);

    } else {
      return cb(null, data);
    }
  };

  FocusedWallet.lock = function() {
    try {
      bwc.lock();
    } catch (e) {};
  };

  FocusedWallet.unlock = function(cb) {
    $log.debug('Wallet is encrypted');
    var bwc = FocusedWallet.bwc;
    $rootScope.$emit('Local/NeedsPassword', false, function(err2, password) {
      if (err2 || !password) {
        return cb({
          message: (err2 || gettext('Password needed'))
        });
      }
      try {
        bwc.unlock(password);
      } catch (e) {
        $log.debug(e);
        return cb({
          message: gettext('Wrong password')
        });
      }
      $timeout(function() {
        if (bwc.isPrivKeyEncrypted()) {
          $log.debug('Locking wallet automatically');
          FocusedWallet.lock();
        };
      }, 2000);
      return cb();
    });
  };

  FocusedWallet.requestTouchid = function(cb) {
    var bwc = FocusedWallet.bwc;
    var config = configService.getSync();
    config.touchIdFor = config.touchIdFor || {};
    if (window.touchidAvailable && config.touchIdFor[bwc.credentials.walletId]) {
      $rootScope.$emit('Local/RequestTouchid', cb);
    } else {
      return cb();
    }
  };

  FocusedWallet.signAndBroadcast = function(txp, cb) {
    var bwc = FocusedWallet.bwc;
    $rootScope.$emit('Local/FocusedWalletStatus', gettext('Signing transaction'));
    bwc.signTxProposal(txp, function(err, signedTx) {
      $rootScope.$emit('Local/FocusedWalletStatus');
      FocusedWallet.lock();

      if (err) {
        if (!lodash.isObject(err)) {
          err = {message: err};
        }
        err.message = bwsError.msg(err, gettextCatalog.getString('The payment was created but could not be signed. Please try again from home screen'));
        return cb(err);
      }

      if (signedTx.status == 'accepted') {
        $rootScope.$emit('Local/FocusedWalletStatus', gettext('Broadcasting transaction'));
        bwc.broadcastTxProposal(signedTx, function(err, btx, memo) {
          $rootScope.$emit('Local/FocusedWalletStatus');
          if (err) {
            err.message = bwsError.msg(err, gettextCatalog.getString('The payment was signed but could not be broadcasted. Please try again from home screen'));
            return cb(err);
          }
          if (memo) {
            $log.info(memo);
          }

          txStatus.notify($rootScope, bwc, btx, function() {
            $rootScope.$emit('Local/TxProposalAction', true);
            return cb();
          });
        });

      } else {
        txStatus.notify($rootScope, bwc, signedTx, function() {
          $rootScope.$emit('Local/TxProposalAction');
          return cb();
        });
      }
    });
  };

  //
  // data: {
  //   // For payment-protocol payments provide the following.
  //   payProUrl:
  //   memo:
  //   // For all other payments provide the following.
  //   // These values must conform to PayPro.get() properties.
  //   toAddress:
  //   amount:
  //   memo:
  // }
  // 
  FocusedWallet.sendPayment = function(data, cb) {
    var bwc = FocusedWallet.bwc;
    if (bwc.isPrivKeyEncrypted()) {
      FocusedWallet.unlock(function(err) {
        if (err) {
          return cb('Could not send payment, wallet could not be unlocked');
        } else {
          return FocusedWallet.sendPayment(data, cb);
        }
      });
    };

    if (data.memo && !bwc.credentials.sharedEncryptingKey) {
      var msg = 'Could not add message to imported wallet without shared encrypting key';
      $log.warn(msg);
      return cb(gettext(msg));
    }

    $rootScope.$emit('Local/FocusedWalletStatus', gettext('Creating transaction'));

    FocusedWallet.getTransactionData(data, function(err, txData) {
      FocusedWallet.requestTouchid(function(err) {
        if (err) {
          $rootScope.$emit('Local/FocusedWalletStatus');
          FocusedWallet.lock();
          return cb(err);
        }

        FocusedWallet.getFee(function(err, feePerKb) {
          if (err) {
            $log.debug(err);
          }

          var config = configService.getSync().wallet.settings;
          var confirmMessage = 'Send ' + (txData.amount / config.unitToSatoshi) + ' ' + config.unitName + ' to ' + txData.toAddress + '?';

          confirmDialog.show(confirmMessage, function(confirmed) {
            if (!confirmed) {
              return cb();
            }

            bwc.sendTxProposal({
              toAddress: txData.toAddress,
              amount: txData.amount,
              message: txData.memo,
              payProUrl: txData.url ? txData.url : null,
              feePerKb: feePerKb,
              excludeUnconfirmedUtxos: !configService.getSync().wallet.spendUnconfirmed
            }, function(err, txp) {
              if (err) {
                $rootScope.$emit('Local/FocusedWalletStatus');
                FocusedWallet.lock();
                return cb(err);
              }

              if (!bwc.canSign() && !bwc.isPrivKeyExternal()) {
                $log.info('No signing proposal: No private key')
                $rootScope.$emit('Local/FocusedWalletStatus');
                txStatus.notify($rootScope, bwc, txp, function() {
                  $rootScope.$emit('Local/TxProposalAction');
                });
                return cb();
              }

              FocusedWallet.signAndBroadcast(txp, function(err) {
                $rootScope.$emit('Local/FocusedWalletStatus');
                if (err) {
                  $rootScope.$emit('Local/TxProposalAction');
                  cb(err.message);
                }
              });
            });
          });
        });
      });
    });
    return cb();
  };

  return FocusedWallet;
});
