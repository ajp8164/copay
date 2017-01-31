'use strict';

angular.module('copayApp.controllers').controller('preferencesDataServicesController', function($scope, lodash, configService, popupService, gettextCatalog, dataService, bitcoinDataService) {


  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    var config = configService.getSync();
    $scope.dataServices = lodash.cloneDeep(config.dataServices);

    // Global data service settings
    $scope.dataServices.refreshPeriod = lodash.find(dataService.refreshPeriods, function(period) {
      return period.value == config.dataServices.refreshPeriod;
    });

    // Bitcoin data service settings
    var bitcoinData = bitcoinDataService.getData();
    $scope.dataServices.bitcoinDataService.marketSourceName = bitcoinData.market.sources[$scope.dataServices.bitcoinDataService.marketSource.id].name;
    $scope.dataServices.bitcoinDataService.networkSourceName = bitcoinData.network.sources[$scope.dataServices.bitcoinDataService.networkSource.id].name;

    $scope.chartCount = JSON.parse($scope.dataServices.bitcoinDataService.charts).length;
  });

  $scope.save = function() {   
    saveGlobalDSSettings()
     .then(saveBitcoinDSSettings)
     .catch(handleSaveError);
  };

  var saveGlobalDSSettings = function() {
    var promise = new Promise(function(resolve, reject) {
      dataService.setConfig({
        enabled: $scope.dataServices.enabled,
        refreshPeriod: $scope.dataServices.refreshPeriod.value
      }, function(err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
     return promise;
  };

  var saveBitcoinDSSettings = function() {
    var promise = new Promise(function(resolve, reject) {
      bitcoinDataService.setConfig({
        enabled: $scope.dataServices.bitcoinDataService.enabled
      }, function(err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
     return promise;
  };

  var handleSaveError = function(err) {
    $log.error(err);
    return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Could not save settings.'));
  };

});
