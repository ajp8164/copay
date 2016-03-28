'use strict';

angular.module('copayApp.controllers').controller('sidebarRightController', function($rootScope, $log, appletService, dragulaService) {

  var self = this;
  this.applets = [];

  // Applets change when the theme is changed.
  $rootScope.$on('Local/ThemeUpdated', function(event) {
    self.applets = appletService.getApplets();
  });

  // Listen for changes to wallet skins and update wallet applets.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/SkinUpdated', function(event) {
    self.applets = appletService.getApplets();
  });

  // Listen for new or deleted wallets.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/NewFocusedWallet', function(fc) {
    self.applets = appletService.getApplets();
  });

  $rootScope.$on('applet-bag.drop-model', function (event, element, target, source) {
    $log.debug('drop model event: applets rearranged');
    // self.applets ordering has changed and is in sync with user arrangement.
    // Should persist the array (only applet.header.name) in preferences.
  });

});
