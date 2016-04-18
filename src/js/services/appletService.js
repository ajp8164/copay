'use strict';

angular.module('copayApp.services').factory('appletService', function($rootScope, $log, $timeout, $css, $ionicModal, $ionicPopover, lodash, Applet, Skin, PluginRegistry, profileService, configService, appletCatalogService, appletSessionService, themeService, FocusedWallet, go) {

  var APPLET_IDENTIFIER_WALLET_PREFIX = 'com.bitpay.copay.applet.wallet.';
  var PLUGIN_IDENTIFIER_WALLET_PREFIX = 'com.bitpay.copay.plugin.wallet.';
  var APPLET_IDENTIFIER_BUILTIN_PREFIX = 'com.bitpay.copay.applet.builtin.';
  var PLUGIN_IDENTIFIER_BUILTIN_PREFIX = 'com.bitpay.copay.plugin.builtin.';

	var root = {};
  root.initialized = false;

  function publishAppletFunctions() {
		$rootScope.applet = {
			close: function(sessionId) { return root.doCloseApplet(sessionId); },
			open: function(applet) { return root.doOpenApplet(applet); }
		};
  };

  function showApplet(session) {
    appletSessionService.activateSession(session.id);
		root.appletModal.show();
  };

  function hideApplet(session) {
		// Pop the skin containing the applet off the stack (re-apply prior skin).
    appletSessionService.deactivateSession(session.id);
	  themeService.popSkin();
    root.appletModal.remove();
  };

  // Creates an applet schema from wallet credentials.
  function createWalletAppletSchema(credentials) {
    var config = configService.getSync();
		config.aliasFor = config.aliasFor || {};
  	var walletSkin = themeService.getPublishedSkinForWalletId(credentials.walletId);
  	return {
	    "header": {
        "appletId": APPLET_IDENTIFIER_WALLET_PREFIX + credentials.walletId,
        "pluginId": PLUGIN_IDENTIFIER_WALLET_PREFIX + credentials.walletId,
	      "name": config.aliasFor[credentials.walletId] || credentials.walletName
	    },
	    "model": {
	      "isoCode": config.wallet.settings.unitName == 'bits' || config.wallet.settings.unitName == 'BTC' ? 'XBT' : config.wallet.settings.alternativeIsoCode,
	      "unitName": config.wallet.settings.unitName,
	      "m": credentials.m,
	      "n": credentials.n,
	      "network": credentials.network,
	      "walletId": credentials.walletId
	    },
	    "view": {
        "avatarColor": walletSkin.view.avatarColor,
        "avatarBackground": walletSkin.view.avatarBackground,
        "avatarBorder": walletSkin.view.avatarBorderSmall
	    },
	    "services" : []
	  }
  };

  // Creates an applet schema for builtin capabilities.
  function createBuiltinAppletSchema(capability) {
  	return {
	    "header": {
        "appletId": APPLET_IDENTIFIER_BUILTIN_PREFIX + capability.id,
        "pluginId": PLUGIN_IDENTIFIER_BUILTIN_PREFIX + capability.id,
	      "name": capability.name
	    },
	    "model": {
	      "uri": capability.uri,
	    },
	    "view": {
	      "launchIconBackground": capability.launchIconBackground,
	    },
	    "services" : []
	  }
  };

  function getWalletsAsApplets() {
		var credentials = lodash.filter(profileService.profile.credentials, 'walletName');
    var walletApplets = lodash.map(credentials, function(c) {
    	return new Applet(createWalletAppletSchema(c), null);
    });
    return lodash.sortBy(walletApplets, 'header.name');
  };

  function getBuiltinApplets() {
    var builtinApplets = [];
    var iconPath = themeService.getCurrentTheme().header.path + '/applet-icons/';

    // Create wallet
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'create-wallet',
      name: 'Create Wallet',
      uri: 'create',
      launchIconBackground: 'url(' + iconPath + 'wallet-new.png) center / cover no-repeat rgba(0,0,0,0)',
    })));

    // Join wallet
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'join-wallet',
      name: 'Join Wallet',
      uri: 'join',
      launchIconBackground: 'url(' + iconPath + 'wallet-join.png) center / cover no-repeat rgba(0,0,0,0)',
    })));

    // Import wallet
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'import-wallet',
      name: 'Import Wallet',
      uri: 'import',
      launchIconBackground: 'url(' + iconPath + 'wallet-import.png) center / cover no-repeat rgba(0,0,0,0)',
    })));

    // Global preferences
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'prefs-global',
      name: 'Settings',
      uri: 'preferencesGlobal',
      launchIconBackground: 'url(' + iconPath + 'settings.png) center / cover no-repeat rgba(0,0,0,0)',
    })));

  	// Glidera
  	builtinApplets.push(new Applet(createBuiltinAppletSchema({
  		id: 'glidera',
  		name: 'Glidera',
  		uri: 'glidera',
  		launchIconBackground: 'url(' + iconPath + 'glidera.png) center / cover no-repeat rgba(0,0,0,0)',
  	})));

    // Coinbase
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'coinbase',
      name: 'Coinbase',
      uri: 'coinbase',
      launchIconBackground: 'url(' + iconPath + 'coinbase.png) center / cover no-repeat rgba(0,0,0,0)',
    })));
  	return builtinApplets;
  };

  function openApplet(applet) {
  	// Create a session id for the applet.
  	appletSessionService.createSession(applet, function(session) {

      $rootScope.$emit('Local/AppletEnter', applet, FocusedWallet.getWalletId());

      // Apply the skin containing the applet.
      themeService.setAppletByNameForWallet(applet.header.name, FocusedWallet.getWalletId(), function() {
        applet.initEnvironment();

        // Create the applet modal.
        // 
        root.appletModal = $ionicModal.fromTemplate('\
          <ion-modal-view class="applet-modal">\
            <ion-footer-bar class="footer-bar-applet" ng-style="{\'background\': applet.view.footerBarBackground, \'border-top\': applet.view.footerBarTopBorder}">\
              <button class="footer-bar-item item-center button button-clear button-icon ion-ios-circle-filled button-applet-close"\
              ng-style="{\'background\': applet.view.footerBarBackground, \'color\': applet.view.footerBarButtonColor}" ng-click="applet.close(\'' + session.id + '\')"></button>\
              <button class="footer-bar-item item-right button button-clear button-icon ion-more"\
              ng-style="{\'background\': applet.view.footerBarBackground, \'color\': applet.view.footerBarButtonColor}" ng-click="appletInfoPopover.show($event)"></button>\
            </ion-footer-bar>\
            <script id="templates/appletInfoPopover.html" type="text/ng-template">\
              <ion-popover-view class="popover-applet-info">\
                <ion-content>\
                  <div class="card">\
                    <div class="item item-divider">\
                      <span class="section">' + (FocusedWallet.getInfo().client.alias || FocusedWallet.getInfo().client.credentials.walletName || "---") + '</span>\
                    </div>\
                    <div class="item item-text-wrap">\
                      <span class="text">' + (FocusedWallet.getBalanceAsString('totalAmount', false) || '--- ' + FocusedWallet.getInfo().config.settings.unitName) + '</span><br>\
                      <span class="text">' + (FocusedWallet.getBalanceAsString('totalAmount', true) || '--- ' +  FocusedWallet.getInfo().config.settings.alternativeIsoCode) + '</span>\
                    </div>\
                  </div>\
                </ion-content>\
              </ion-popover-view>\
            </script>\
            <ion-pane ng-style="{\'background\': applet.view.background}">\
              <div ng-include="\'' + applet.mainViewUrl() + '\'" ng-init="sessionId=\'' + session.id + '\'">\
            </ion-pane>\
          </ion-modal-view>\
          ', {
          scope: $rootScope,
          backdropClickToClose: false,
          hardwareBackButtonClose: false,
          animation: 'animated zoomIn',
          hideDelay: 1000,
          session: session,
          walletId: FocusedWallet.getWalletId()
        });

        $ionicPopover.fromTemplateUrl('templates/appletInfoPopover.html', {
          scope: root.appletModal.scope,
        }).then(function(popover) {
          $rootScope.appletInfoPopover = popover;
        });

        // Present the modal, allow some time to render before presentation.
        $timeout(function() {
          showApplet(session);
        }, 50);
      });
    });
  };

  function openWallet(walletId) {
  	// Avoid changing wallets if the requested wallet is currently set.
  	if (walletId != FocusedWallet.getWalletId()) {
	    profileService.setAndStoreFocus(walletId, function() {});
	  }
  };

  function openCapability(uri) {
    go.path(uri);
  };

	root.init = function(callback) {
		if (appletCatalogService.supportsWriting()) {
      appletCatalogService.init(function() {

      	// Cache the applet catalog.
		    appletCatalogService.get(function(err, catalog) {
		      $log.debug('Applet catalog read');
		      if (err) {
		        $log.debug('Error reading applet catalog');
		        $rootScope.$emit('Local/DeviceError', err);
		        return;
		      }

					// Publish applet functions to $rootScope.
					publishAppletFunctions();
          root.initialized = true;
					callback();
					$log.debug('Applet service initialized');
				});
      });
    } else {
    	// TODO: no storage, applets not supported on this device
    }
	};

  root.isAppletBuiltin = function(applet) {
    return applet.header.appletId.includes(APPLET_IDENTIFIER_BUILTIN_PREFIX);
  };

  root.isAppletPlugin = function(applet) {
    return !root.isAppletBuiltin(applet) && !root.isAppletWallet(applet);
  };

  root.isAppletWallet = function(applet) {
    return applet.header.appletId.includes(APPLET_IDENTIFIER_WALLET_PREFIX);
  };

  // Return the collection of all available applets.
  root.getApplets = function() {
  	// Wallet applets.
		var walletApplets = getWalletsAsApplets();

		// Applets available through the current theme.
    var applets = lodash.map(themeService.getAppletSkins(), function(skin) {
      return new Skin(skin).getApplet();
    });

    // Some built-in capabilities are exposed as applets.
    var builtinApplets = getBuiltinApplets();

    // Return a comprehensive list of all applets.
    return builtinApplets.concat(walletApplets).concat(applets);
  };

  root.doOpenApplet = function(applet) {
  	if (root.isAppletWallet(applet)) {
  		openWallet(applet.model.walletId);
  	} else if (root.isAppletBuiltin(applet)) {
  		openCapability(applet.model.uri);
  	} else {
  		openApplet(applet);
  	}
  };

  root.doCloseApplet = function(sessionId) {
    var session = appletSessionService.getSession(sessionId);
    var applet = session.getApplet();

    $rootScope.$emit('Local/AppletLeave', applet, FocusedWallet.getWalletId());
    hideApplet(session);
    applet.finalize(function() {
      appletSessionService.destroySession(session.id);
    });
  };

  $rootScope.$on('modal.shown', function(event, modal) {
  	$rootScope.$emit('Local/AppletShown', modal.session.getApplet(), modal.walletId);
  });

  $rootScope.$on('modal.hidden', function(event, modal) {
  	$rootScope.$emit('Local/AppletHidden', modal.session.getApplet(), modal.walletId);
  });

  root.getAppletsLayout = function() {
    if (!root.initialized) return;
    var catalog = appletCatalogService.getSync();
    return catalog.appletLayout;
  };

  root.saveAppletsLayout = function(layout, callback) {
    var cat = {
      appletLayout: {}
    };

    cat.appletLayout = layout;

		appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
    });
  };

  root.finalize = function() {
    // Close any currently running applet.
    var activeSession = appletSessionService.getActiveSession();
    if (!lodash.isUndefined(activeSession)) {
      root.doCloseApplet(activeSession.id);
    }

    appletSessionService.finalize();
  };

  return root;
});
