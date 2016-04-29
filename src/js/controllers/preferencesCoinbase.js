'use strict';

angular.module('copayApp.controllers').controller('preferencesCoinbaseController', 
  function($scope, $ionicModal) {

    this.revokeToken = function(testnet) {
      $scope.network = testnet ? 'testnet' : 'livenet';

      $ionicModal.fromTemplateUrl('views/modals/coinbase-confirmation.html', {
        scope: $scope,
        backdropClickToClose: false,
        hardwareBackButtonClose: false,
        animation: 'slide-in-up'
      }).then(function(modal) {
        $scope.coinbaseConfirmationModal = modal;
        $scope.coinbaseConfirmationModal.show();
      });
    };

  });
