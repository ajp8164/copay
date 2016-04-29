'use strict';

angular.module('copayApp.controllers').controller('coinbaseConfirmationController', function($scope, $timeout, coinbaseService, applicationService) {

	var self = $scope.self;

  $scope.ok = function() {
    coinbaseService.logout($scope.network, function() {

      $timeout(function() {
        applicationService.restart();
      }, 1000);
    });
    $scope.cancel();
  };

  $scope.cancel = function() {
    $scope.coinbaseConfirmationModal.hide();
    $scope.coinbaseConfirmationModal.remove();
  };

});