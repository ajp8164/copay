'use strict';

angular.module('copayApp.controllers').controller('posPaymentController',
  function($scope, $rootScope, $log, $timeout, lodash, configService, profileService, posPaymentService, gettextCatalog) {

    var self = this;
    var config = configService.getSync();

    function getWallets(testnet) {
      var network = testnet ? 'testnet' : 'livenet';
      return lodash.filter(profileService.getWallets(network), function(w) {
        return w.network == network;
      });
    };

    function setOngoingProcess(message) {
      if (message) {
        window.plugins.spinnerDialog.hide();
        window.plugins.spinnerDialog.show(null, message + '...', true);
      } else {
        window.plugins.spinnerDialog.hide();
      }
    };

    this.init = function() {
      self.message = posPaymentService.message;
      self.paymentUri = posPaymentService.paymentUri;
      self.wallets = getWallets(false);
    };

    this.payFromWallet = function(walletId) {
      var client = profileService.getClient(walletId);
      profileService.isReady(client, function(err) {
        if (err) {
          // Can't pay, wallet is not ready.
          // TODO: can we do this in getWallets() or does isReady() call BWS (long call)?
          self.error = err;
          $log.debug('Error: ' + err + ', cannot pay with ' + client.credentials.walletName);
        } else {
          $log.debug('POS payment - paying with ' + client.credentials.walletName);

          posPaymentService.makePayment(client, self.paymentUri, function(err) {
            
            if (err) {
              self.error = err.message;
              $timeout(function() {
                $scope.$apply();
              });
            }
          }, setOngoingProcess);
        }
      });
    };

    this.resetError = function() {
      this.error = null;
    };

  });
