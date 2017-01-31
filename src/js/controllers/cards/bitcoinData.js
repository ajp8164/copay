'use strict';

angular.module('copayApp.controllers').controller('bitcoinDataController', function($rootScope, $scope, $timeout, $log, $ionicScrollDelegate, lodash, bitcoinDataService, configService, popupService) {

  // Chartjs configurations.
  // 
  var chartConfig = {
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
              unit: undefined,
              unitStepSize: undefined,
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
                // Prevents the last (n) tick from overlapping the n-1 tick by removing the n-1 tick.
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

  var availableCharts = {
    'series1dPriceUSD': {
      colors: getColors('seriesPrice'),
      options: getOptions('seriesPrice', {
        unit: 'hour',
        unitStepSize: 4
      })
    },
    'series7dPriceUSD': {
      colors: getColors('seriesPrice'),
      options: getOptions('seriesPrice', {
        unit: 'day',
        unitStepSize: 1
      })
    },
    'series30dPriceUSD': {
      colors: getColors('seriesPrice'),
      options: getOptions('seriesPrice', {
        unit: 'week',
        unitStepSize: 1
      })
    }
  };

  // Card is initially collaped.
  $scope.collapsed = true;

  // Update scope each time new data is available.
  bitcoinDataService.whenAvailable(function() {
    setScope();
  });

  function setScope() {
    bitcoinDataService.getConfig(function(config) {
      $scope.data = bitcoinDataService.getData();
      $scope.na = $scope.data.info.naPlaceholder;
      $scope.config = config;

      $scope.dataServiceEnabled = $scope.config.enabled && configService.getSync().experimental.dataServices.enabled;
      $scope.marketUp = ($scope.data.market.changeUSD[$scope.config.marketSource.id] >= 0);

      $scope.charts = [];
      for (var i = 0; i < $scope.config.charts.length; i++) {
        if ($scope.data.market[$scope.config.charts[i]][$scope.config.marketSource.id]) {
          if (availableCharts[$scope.config.charts[i]]) {

            var title = $scope.data.market[$scope.config.charts[i]].label;
            if ($scope.data.market[$scope.config.charts[i]].unit.length > 0) {
              title += ' (' + $scope.data.market[$scope.config.charts[i]].unit + ')';
            }

            $scope.charts.push({
              id: $scope.config.charts[i],
              title: title,
              data: $scope.data.market[$scope.config.charts[i]][$scope.config.marketSource.id].data,
              labels: $scope.data.market[$scope.config.charts[i]][$scope.config.marketSource.id].labels,
              series: $scope.data.market[$scope.config.charts[i]][$scope.config.marketSource.id].series,
              colors: availableCharts[$scope.config.charts[i]].colors,
              options: availableCharts[$scope.config.charts[i]].options
            });
          } else {
            $log.debug('View doesn\'t know how to render chart: ' + $scope.config.charts[i]);
          }
        }
      }

      $timeout(function(){
        $scope.$apply();
      });
    });
  };

  $scope.toggleCollapse = function() {
    $scope.collapsed = !$scope.collapsed;
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();
    }, 10);
  };

  $scope.refresh = function() {
    bitcoinDataService.refresh();
  };

  $scope.showAbout = function() {
    var body = '';
    var marketSource = $scope.data.market.sources[$scope.config.marketSource.id];
    var networkSource = $scope.data.network.sources[$scope.config.networkSource.id];
    var disclaimer = $scope.data.info.disclaimer;
  
    if ($scope.config.marketSource.id != 'none') {
      body +=
        '<div class="section">' +
          '<div class="title"><img src="{marketSourceLogo}" alt=""/></div>' +
          '<div class="primary">{marketSourceDescription}</div>' +
          '<div class="secondary">{marketSourceUrl}</div>' +
        '</div>';

      body = body.replace('{marketSourceDescription}', marketSource.description);
      body = body.replace('{marketSourceUrl}', marketSource.url);
      body = body.replace('{marketSourceLogo}', marketSource.logo);
    }

    if ($scope.config.networkSource.id != 'none') {
      body +=
        '<div class="section">' +
          '<div class="title"><img src="{networkSourceLogo}" alt=""/></div>' +
          '<div class="primary">{networkSourceDescription}</div>' +
          '<div class="secondary">{networkSourceUrl}</div>' +
        '</div>';

      body = body.replace('{networkSourceDescription}', networkSource.description);
      body = body.replace('{networkSourceUrl}', networkSource.url);
      body = body.replace('{networkSourceLogo}', networkSource.logo);
    }

    body +=
      '<div class="section">' +
        '<div class="disclaimer">{disclaimer}</div>' +
      '</div>';

    body = body.replace('{disclaimer}', disclaimer);

    var opts = {
      forceHTMLPrompt: true,
      class: 'bitcoin-data-about-popup',
      template: body
    };
    popupService.showAlert(null, null, null, null, opts);
  };

  function getColors(config) {
    return lodash.cloneDeep(chartConfig[config].colors);
  };

  function getOptions(config, opts) {
    var options = lodash.cloneDeep(chartConfig[config].options);
    options.scales.xAxes[0].time.unit = opts.unit;
    options.scales.xAxes[0].time.unitStepSize = opts.unitStepSize;
    return options;
  };

  $rootScope.$on('Local/BitcoinDataServiceUpdate', function(event, config) {
    setScope();
  });

  $rootScope.$on('Local/ExperimentChange', function(event, config) {
    $scope.dataServiceEnabled = $scope.config.enabled && configService.getSync().experimental.dataServices.enabled;
  });

  // Initialize the view.
  setScope();

});
