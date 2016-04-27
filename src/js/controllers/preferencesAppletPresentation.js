'use strict';

angular.module('copayApp.controllers').controller('preferencesAppletPresentationController', function($rootScope, go, Constants, appletCatalogService) {

  var self = this;

  this.init = function() {
    var catalog = appletCatalogService.getSync();
    this.appletPresentationOptions = Constants.appletPresentationOptions;
    this.selectedPresentation = catalog.environment.presentation;
  };

  this.setPresentation = function(presentation) {
    var catalog = appletCatalogService.getSync();

    var cat = {
      environment: {}
    };

    cat.environment.presentation = presentation;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
      go.path('preferencesApplets');
    });
  };

});
