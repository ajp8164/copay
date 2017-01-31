'use strict';

angular.module('copayApp.controllers').controller('prefsBitcoinDSMarketSourceController', function($scope, $log, popupService, gettextCatalog, bitcoinDataService) {

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    bitcoinDataService.getConfig(function(config) {
      var bitcoinData = bitcoinDataService.getData();

      $scope.sources = bitcoinData.market.sources;
      $scope.currentSource = bitcoinData.market.sources[config.marketSource.id].id;
    });
  });

  $scope.save = function(source) {
    bitcoinDataService.setConfig({
      marketSource: {
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
