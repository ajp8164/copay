'use strict';

angular.module('copayApp.controllers').controller('sidebarRightController', function($rootScope, $scope, $state, $log, $timeout, lodash, go, themeService, profileService, configService, dragularService) {

  var self = this;
  var config = configService.getSync();
  this.appletGalleryLayout = config.view.appletGalleryLayout;
  this.applets = themeService.getAppletSkins();

  this.init = function() {
    this.dragularOptions = {
      classes: {
        mirror: 'custom-green-mirror'
      },
      nameSpace: 'common' // just connecting left and right container
    };
  }

  this.init();
});
