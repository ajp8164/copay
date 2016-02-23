'use strict';

angular.module('copayApp.controllers').controller('sidebarLeftController', function($rootScope, $timeout, $log, lodash, profileService, configService, go, isMobile, isCordova, themeService) {
  var self = this;
  self.isWindowsPhoneApp = isMobile.Windows() && isCordova;
  self.walletSelection = false;

  // wallet list change
  $rootScope.$on('Local/WalletListUpdated', function(event) {
    self.walletSelection = false;
    self.setWallets();
  });

  $rootScope.$on('Local/SkinUpdated', function(event) {
    self.setWallets();
  });
  
  $rootScope.$on('Local/ThemeUpdated', function(event) {
    self.setWallets();
  });
  
  $rootScope.$on('Local/AliasUpdated', function(event) {
    self.setWallets();
  });

  self.signout = function() {
    profileService.signout();
  };

  self.switchWallet = function(selectedWalletId, currentWalletId) {
    if (selectedWalletId == currentWalletId) return;
    self.walletSelection = false;
    profileService.setAndStoreFocus(selectedWalletId, function() {});
  };

  self.toggleWalletSelection = function() {
    self.walletSelection = !self.walletSelection;
    if (!self.walletSelection) return;
    self.setWallets();
  };

  self.setWallets = function() {
    if (!profileService.profile) return;
    if (!themeService.initialized) return;
    var config = configService.getSync();
    config.aliasFor = config.aliasFor || {};
    config.theme.skinFor = config.theme.skinFor || {};

    // Sanitize empty wallets (fixed in BWC 1.8.1, and auto fixed when wallets completes)
    var credentials = lodash.filter(profileService.profile.credentials, 'walletName');
    var ret = lodash.map(credentials, function(c) {
      return {
        m: c.m,
        n: c.n,
        name: config.aliasFor[c.walletId] || c.walletName,
        id: c.walletId,
        avatarColor: themeService.isInitialized() ? themeService.getPublishedSkinForWalletId(c.walletId).view.avatarColor : '#4A90E2',
        avatarBackground: themeService.isInitialized() ? themeService.getPublishedSkinForWalletId(c.walletId).view.avatarBackground : '#FFFFFF',
        avatarBorder: themeService.isInitialized() ? themeService.getPublishedSkinForWalletId(c.walletId).view.avatarBorderSmall : 'none',
      };
    });

    self.wallets = lodash.sortBy(ret, 'name');
  };

  self.setWallets();

});
