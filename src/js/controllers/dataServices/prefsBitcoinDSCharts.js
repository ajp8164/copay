'use strict';

angular.module('copayApp.controllers').controller('prefsBitcoinDSChartsController', function($scope, $log, lodash, popupService, gettextCatalog, bitcoinDataService) {

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    bitcoinDataService.getConfig(function(config) {
      var bitcoinData = bitcoinDataService.getView('default');

      $scope.charts = {};
      var categories = bitcoinDataService.categoryList();
      for (var i = 0; i < categories.length; i++) {

        var charts = lodash.pick(bitcoinData[categories[i]], function(elem) {
          return (elem.options && elem.options.plot);
        });

        lodash.merge($scope.charts, charts);
      }

      // Select configured charts.
      Object.keys($scope.charts).forEach(function(chartId) {
        $scope.charts[chartId].selected = config.charts.includes(chartId);
    
        // Add the chart id into each chart object so we can save it later.
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
