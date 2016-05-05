'use strict';

angular.module('copayApp.model').factory('FocusedWallet', function ($rootScope, Wallet) {

  var wallet = {};

  // FocusedWallet is a singleton object representing the currently focused/selected wallet.
  // Updates are received via events.
  // 
  function createInstance() {
    return new Wallet();
  };

  // Listen for wallet client changes and statically cache the Bitcore Wallet Client (bwc) when a change is made.
  // 
  $rootScope.$on('Local/NewFocusedWallet', function(event, bwc) {
    wallet = new Wallet(bwc);
  });

  // Listen for balance updates.
  // 
  $rootScope.$on('Local/WalletStatus', function(event, walletStatus) {
    wallet.status = walletStatus;
  });

  return {
    getInstance: function () {
      if (!wallet) {
        wallet = createInstance();
      }
      return wallet;
    }
  };

});
