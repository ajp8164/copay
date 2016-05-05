'use strict';

angular.module('copayApp.controllers').controller('sidebarRightController', function(lodash, appletService, appletCatalogService, Constants, FocusedWallet) {

  var self = this;

  this.init = function() {
  };

  this.isCategoryPresentation = function() {
    if (!appletService.isInitialized()) return;
    var catalog = appletCatalogService.getSync();
    return catalog.environment.presentation == Constants.LAYOUT_CATEGORIES;
  };

  this.isListPresentation = function() {
    if (!appletService.isInitialized()) return;
    var catalog = appletCatalogService.getSync();
    return catalog.environment.presentation == Constants.LAYOUT_LIST;
  };

  this.isDesktopPresentation = function() {
    if (!appletService.isInitialized()) return;
    var catalog = appletCatalogService.getSync();
    return catalog.environment.presentation == Constants.LAYOUT_DESKTOP;
  };

  this.hasActiveCategory = function() {
    return !lodash.isEmpty(appletService.getActiveCategory());
  };

  this.isAppletBuiltin = function(applet) {
    return appletService.isAppletBuiltin(applet);
  };

  this.isAppletPlugin = function(applet) {
    return appletService.isAppletPlugin(applet);
  };

  this.isAppletWallet = function(applet) {
    return appletService.isAppletWallet(applet);
  };

  this.currentWallet = function() {
    // Map only the information we need for the ui.
    var wallet = FocusedWallet.getInstance();
    if (!wallet.isValid()) return;
    var info = wallet.getInfo();
    return {
      name: info.client.alias || info.client.credentials.walletName || '---',
      network: info.client.credentials.network || '',
      m: info.client.credentials.m || '',
      n: info.client.credentials.n || '',
      balance: wallet.getBalanceAsString('totalAmount', false) || '--- ' + info.config.settings.unitName,
      altBalance: wallet.getBalanceAsString('totalAmount', true) || '--- ' + info.config.settings.alternativeIsoCode
    }
  };

});
