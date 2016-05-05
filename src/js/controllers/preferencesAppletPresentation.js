'use strict';

angular.module('copayApp.controllers').controller('preferencesAppletPresentationController', function($rootScope, $ionicSlideBoxDelegate, go, Constants, appletCatalogService, appletService) {

  var self = this;

  this.init = function() {
    var catalog = appletCatalogService.getSync();
    this.appletPresentationOptions = Constants.appletPresentationOptions;
    this.selectedPresentation = catalog.environment.presentation;
  };

  this.setPresentation = function(presentation) {
    var newEnvironment = {
      presentation: presentation
    };

    appletService.updateAppletEnvironment(newEnvironment, function() {
      if (presentation != Constants.LAYOUT_CATEGORIES) {
        appletService.clearActiveCategory();
        $ionicSlideBoxDelegate.$getByHandle('appletPresentationSlideBox').slide(0);
      }

      go.path('preferencesApplets');      
    });
  };

});
