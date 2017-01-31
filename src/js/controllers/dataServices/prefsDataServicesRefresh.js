'use strict';

angular.module('copayApp.controllers').controller('prefsDataServicesRefreshController', function($scope, $log, popupService, gettextCatalog, dataService) {

  $scope.periods = dataService.refreshPeriods;

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    dataService.getConfig(function(config) {
      $scope.currentPeriod = config.refreshPeriod;
    });
  });

  $scope.save = function(period) {
    dataService.setConfig({
      refreshPeriod: period.value
    }, completeSave);
  };

  var completeSave = function(err) {
    if (err) {
      $log.error(err);
      return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Could not save settings.'));
    }
  };

});
