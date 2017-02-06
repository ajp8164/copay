'use strict';

angular.module('copayApp.controllers').controller('bitcoinDataController', function($rootScope, $scope, $timeout, $log, $ionicScrollDelegate, lodash, bitcoinDataService, configService, popupService) {

  var sliders = [];

  // Card is initially collaped.
  $scope.collapsed = true;

  // Update scope each time new data is available.
  bitcoinDataService.whenAvailable(function() {
    setScope();
  });

  function setScope() {
    bitcoinDataService.getConfig(function(config) {
      $scope.data = bitcoinDataService.getView('default');
      $scope.na = $scope.data.info.naPlaceholder;
      $scope.config = config;

      $scope.dataServiceEnabled = $scope.config.enabled && configService.getSync().experimental.dataServices.enabled;
      $scope.marketUp = ($scope.data.market.changeUSD[$scope.config.marketSource.id] >= 0);

      $scope.charts = [];
      var categories = bitcoinDataService.categoryList();

      for (var i = 0; i < $scope.config.charts.length; i++) {
        for (var j = 0; j < categories.length; j++) {

          var chart = $scope.data[categories[j]][$scope.config.charts[i]];
          
          if (chart && chart[$scope.config.marketSource.id]) {
            $scope.charts.push({
              id: $scope.config.charts[i],
              name: chart.name,
              period: chart.label,
              unit: chart.unit,
              data: chart[$scope.config.marketSource.id].data,
              options: chart.options
            });
          }
        }
      }

      $timeout(function(){
        $scope.$apply();
      });



    });
  };

  function updateSliders() {
    sliders.forEach(function(slider) {
      slider.update();
    });
  };

  $scope.toggleCollapse = function() {
    $scope.collapsed = !$scope.collapsed;
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();

      if (!$scope.collapsed && sliders.length == 2) {
        sliders[0].update();
        sliders[1].update();
      }
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

  $scope.$on('$ionicSlides.sliderInitialized', function(event, data) {
    sliders.push(data.slider);
  });

  $rootScope.$on('Local/ExperimentChange', function(event, config) {
    $scope.dataServiceEnabled = $scope.config.enabled && configService.getSync().experimental.dataServices.enabled;
  });

  // Initialize the view.
  setScope();

});
