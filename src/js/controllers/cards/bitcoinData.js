'use strict';

angular.module('copayApp.controllers').controller('bitcoinDataController', function($scope, $timeout, $log, $ionicScrollDelegate, bitcoinDataService) {

  bitcoinDataService.whenAvailable(function() {
    $scope.data = bitcoinDataService.getData();
    $scope.na = bitcoinDataService.naPlaceholder;

    $scope.marketSources = $scope.data.market.sources;
    $scope.networkSources = $scope.data.network.sources;

    $scope.marketSource = 'coinbase';
    $scope.networkSource = 'blockchain';

    $scope.marketUp = ($scope.data.market['change-usd'][$scope.marketSource] >= 0);



    $scope.selectedSeriesPrice = 'series-1d-price-usd';
//    $scope.selectedSeriesPrice = 'series-7d-price-usd';
//    $scope.selectedSeriesPrice = 'series-30d-price-usd';


    var timeConfig = {
      'series-1d-price-usd': {
        unit: 'hour',
        unitStepSize: 4
      },
      'series-7d-price-usd': {
        unit: 'day',
        unitStepSize: 1
      },
      'series-30d-price-usd': {
        unit: 'week',
        unitStepSize: 1
      }
    };

    // Chart presentation.
    $scope.charts = {
      seriesPrice: {
        colors: [{
          borderColor: '#1e3186', // $royal
          backgroundColor: 'rgba(213, 223, 255, 0.5)' // $fill-blue
        }],
        options: {
          tooltips: { enabled: false },
          elements: {
            line: { borderWidth: 1 },
            point: { radius: 0 }
          },
          scales: {
            xAxes: [{
              type: 'time',
              time: {
                unit: timeConfig[$scope.selectedSeriesPrice].unit,
                unitStepSize: timeConfig[$scope.selectedSeriesPrice].unitStepSize,
                displayFormats: {
                  hour: 'H',
                  day: 'D',
                  week: 'MMM D',
                  month: 'MMM D',
                  quarter: 'MMM D',
                  year: 'MMM D'
                }
              },
              ticks: {
                maxRotation: 0,
                fontFamily: '"Roboto", sans-serif',
                fontColor: '#9b9bab', // $light-gray
                fontSize: 12,
                callback: function(value, index, ticks) {
                  // Provides an (improved) work-around.
                  // See https://github.com/chartjs/Chart.js/pull/2600#issuecomment-256716966
                  if ((index == ticks.length - 2) && (Math.abs(ticks[length] - ticks[length-1]) > 1)) {
                    return undefined;
                  } else {
                    return String(value);
                  }
                }
              }
            }],
            yAxes: [{
              type: 'linear',
              ticks: {
                maxRotation: 0,
                fontFamily: '"Roboto", sans-serif',
                fontColor: '#9b9bab', // $light-gray
                fontSize: 12
              }
            }]
          }
        }
      }
    };

  });

  $scope.toggleCollapse = function() {
    $scope.collapsed = !$scope.collapsed;
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();
    }, 10);
  };

  $scope.showAbout = function() {
  };

});
