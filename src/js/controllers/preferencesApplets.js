'use strict';

angular.module('copayApp.controllers').controller('preferencesAppletsController', function($scope, $rootScope, lodash, configService, appletService, appletCatalogService, Applet, Constants) {

  var self = this;
  this.applets = [];

  this.init = function() {
    this.applets = appletService.getAppletsWithState();
    this.selectedPresentation = getPresentation();
  };

  this.appletMayHide = function(applet) {
    return (applet.header.flags & Applet.FLAGS_MAY_NOT_HIDE) == 0;
  };

  this.savePreferences = function() {
    // Create the preferences objects from each applet (store minimal data).
    var preferences = lodash.map(self.applets, function(applet) {
      return {
        appletId: applet.header.appletId,
        preferences: {
          visible: applet.header.visible
        }
      }
    });

    var cat = {
      appletState: []
    };

    cat.appletState = preferences;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
      $scope.$emit('Local/AppletPreferencesUpdated');
      broadcastEvents();
    });
  };

  function broadcastEvents() {
    var catalog = appletCatalogService.getSync();
    var config = configService.getSync();
    var newState;
    var oldState;

    // Glidera.
    newState = lodash.find(catalog.appletState, function(state) {
      return state.appletId.includes('glidera');
    });

    oldState = config.glidera.visible;
    if (newState.preferences.visible != oldState) {
      saveGlideraConfig();
      $rootScope.$emit('Local/GlideraUpdated');
    }

    // Coinbase.
    newState = lodash.find(catalog.appletState, function(state) {
      return state.appletId.includes('coinbase');
    });

    oldState = config.coinbase.visible;
    if (newState.preferences.visible != oldState) {
      saveCoinbaseConfig();
      $rootScope.$emit('Local/CoinbaseUpdated');
    }
  };

  function getPresentation() {
    var catalog = appletCatalogService.getSync();

    if (lodash.isUndefined(catalog.environment) || lodash.isUndefined(catalog.environment.presentation)) {
      // Lazy initialization of the presentation.
      var cat = {
        environment: {}
      };

      cat.environment.presentation = Constants.appletPresentationDefault;

      appletCatalogService.set(cat, function(err) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }
      });
      return Constants.appletPresentationDefault;
    } else {
      return catalog.environment.presentation;
    }
  };

  // TODO: this can be removed when the config settings are removed and the catalog is used instead.
  function saveGlideraConfig() {
    var catalog = appletCatalogService.getSync();

    var glideraState = lodash.find(catalog.appletState, function(state) {
      return state.appletId.includes('glidera');
    });

    var opts = {
      glidera: {
        visible: glideraState.preferences.visible
      },
    };

    configService.set(opts, function(err) {
      if (err) $log.debug(err);
    });
  };

  // TODO: this can be removed when the config settings are removed and the catalog is used instead.
  function saveCoinbaseConfig() {
    var catalog = appletCatalogService.getSync();

    var coinbaseState = lodash.find(catalog.appletState, function(state) {
      return state.appletId.includes('coinbase');
    });

    var opts = {
      coinbase: {
        visible: coinbaseState.preferences.visible
      },
    };

    configService.set(opts, function(err) {
      if (err) $log.debug(err);
    });
  };

  var unwatchApplets = $scope.$watch(function () {
    return self.applets;
   }, function(newVal, oldVal) {
    if (newVal == oldVal) return;
    self.savePreferences();
  }, true);

  $scope.$on('$destroy', function() {
    unwatchApplets();
  });

});
