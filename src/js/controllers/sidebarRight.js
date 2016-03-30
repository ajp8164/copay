'use strict';

angular.module('copayApp.controllers').controller('sidebarRightController', function($rootScope, $log, appletService, dragulaService) {

  var self = this;
  this.applets = [];

  // Applets change when the theme is changed.
  $rootScope.$on('Local/ThemeUpdated', function(event) {
    $log.debug('applet refresh - Local/ThemeUpdated');
    self.applets = appletService.getApplets();
  });

  // Listen for changes to wallet skins and update wallet applets.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/SkinUpdated', function(event, skin, walletId) {
    $log.debug('applet refresh - Local/SkinUpdated ' + skin.header.name + ' for ' + walletId);
    self.applets = appletService.getApplets();
  });

  // Listen for new or deleted wallets.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/NewFocusedWallet', function(event, fc) {
    $log.debug('applet refresh - Local/NewFocusedWallet');
    self.applets = appletService.getApplets();
  });

  $rootScope.$on('Local/AppletEnter', function(event, applet, walletId) {
    $log.debug('applet enter ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('Local/AppletLeave', function(event, applet, walletId) {
    $log.debug('applet leave ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('Local/AppletShown', function(event, applet, walletId) {
    $log.debug('applet shown ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('Local/AppletHidden', function(event, applet, walletId) {
    $log.debug('applet hidden ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('applet-bag.drop-model', function (event, element, target, source) {
    $log.debug('drop model event: applets rearranged');
    // self.applets ordering has changed and is in sync with user arrangement.
    // Should persist the array (only applet.header.name) in preferences.
  });

});
