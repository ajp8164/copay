'use strict';

angular.module('copayApp.controllers').controller('prefsBitcoinDSChartsController', function($scope, $log, lodash, popupService, gettextCatalog, bitcoinDataService) {

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    bitcoinDataService.getConfig(function(config) {
      var bitcoinData = bitcoinDataService.getData();

      $scope.charts = lodash.pick(bitcoinData.market, function(prop) {
        return prop.kind == 'series';
      });

      // Select configured charts.
      Object.keys($scope.charts).forEach(function(chartId) {
        $scope.charts[chartId].selected = config.charts.includes(chartId);
    
        // Place the chart id into each chart object.
        $scope.charts[chartId].id = chartId;
      });

    });
  });

  $scope.save = function(chart) {
    bitcoinDataService.getConfig(function(config) {
      var charts = config.charts;

      if (chart.selected) {
        charts.push(chart.id);
        charts = lodash.uniq(charts);
      } else {
        charts = lodash.pull(charts, chart.id);
      }

      bitcoinDataService.setConfig({
        charts: charts
      }, completeSave);
    });
  };

  var completeSave = function(err) {
    if (err) {
      $log.error(err);
      return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Could not save settings.'));
    }
  };

});
