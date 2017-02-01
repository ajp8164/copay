'use strict';

angular.module('copayApp.controllers').controller('bitcoinDataController', function($rootScope, $scope, $timeout, $log, $ionicScrollDelegate, lodash, bitcoinDataService, configService, popupService) {

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
          if ($scope.data.market[$scope.config.charts[i]].chart.techan) {
            var title = $scope.data.market[$scope.config.charts[i]].label;
            if ($scope.data.market[$scope.config.charts[i]].unit.length > 0) {
              title += ' (' + $scope.data.market[$scope.config.charts[i]].unit + ')';
            }
            $scope.charts.push({
              id: $scope.config.charts[i],
              title: title,
              data: $scope.data.market[$scope.config.charts[i]][$scope.config.marketSource.id].data,
              options: $scope.data.market[$scope.config.charts[i]].chart.techan
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

  $rootScope.$on('Local/BitcoinDataServiceUpdate', function(event, config) {
    setScope();
  });

  $rootScope.$on('Local/ExperimentChange', function(event, config) {
    $scope.dataServiceEnabled = $scope.config.enabled && configService.getSync().experimental.dataServices.enabled;
  });

  // Initialize the view.
  setScope();

});
