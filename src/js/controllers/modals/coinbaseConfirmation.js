'use strict';

angular.module('copayApp.controllers').controller('coinbaseConfirmationController', function($scope, $timeout, storageService, applicationService) {

	var self = $scope.self;

  $scope.ok = function() {
    storageService.removeCoinbaseToken($scope.network, function() {
      $timeout(function() {
        applicationService.restart();
      }, 100);
    });
    $scope.cancel();
  };

  $scope.cancel = function() {
    $scope.coinbaseConfirmationModal.hide();
    $scope.coinbaseConfirmationModal.remove();
  };

});