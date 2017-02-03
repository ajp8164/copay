'use strict';

angular.module('copayApp.controllers').controller('prefsBitcoinDSNetworkSourceController', function($scope, $log, popupService, gettextCatalog, bitcoinDataService) {

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    bitcoinDataService.getConfig(function(config) {
      var bitcoinData = bitcoinDataService.getView('default');

      $scope.sources = bitcoinData.network.sources;
      $scope.currentSource = bitcoinData.network.sources[config.networkSource.id].id;
    });
  });

  $scope.save = function(source) {
    bitcoinDataService.setConfig({
      networkSource: {
        id: source.id
      }
    }, completeSave);
  };

  var completeSave = function(err) {
    if (err) {
      $log.error(err);
      return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Could not save settings.'));
    }
  };

});
