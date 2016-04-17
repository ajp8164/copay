'use strict';

angular.module('copayApp.services').factory('appletService', function($rootScope, $log, $timeout, $css, $ionicModal, $ionicPopover, lodash, Applet, Skin, profileService, configService, appletCatalogService, appletSessionService, themeService, FocusedWallet, go) {

	var APPLET_WALLET_IDENTIFIER_PREFIX = 'wallet-applet.';
	var APPLET_BUILTIN_IDENTIFIER_PREFIX = 'builtin-applet.';

	var root = {};
  root.initialized = false;

  function initAppletEnvironment(applet) {
    // Make applet properties available to views.
		publishAppletProperties(applet);

		// Set the applet main view.
  	root.appletMainViewUrl = applet.mainViewUrl();

  	// Bind stylesheet(s) for this applet.
  	applet.stylesheets().forEach(function(stylesheet) {
		  $css.bind({ 
		    href: stylesheet
		  }, $rootScope);
  	});
  };

  function publishAppletFunctions() {
		$rootScope.applet = {
			close: function(sessionId) { return root.doCloseApplet(sessionId); },
			open: function(applet) { return root.doOpenApplet(applet); },
			path: function(uri) { return root.appletPath(uri); }
		};
  };

  function publishAppletProperties(applet) {
		$rootScope.applet.header = applet.header;
		$rootScope.applet.model = applet.model;
    $rootScope.applet.view = applet.view;
    $rootScope.applet.title = applet.header.name;
  };

  function removeAppletProperties() {
		delete $rootScope.applet.header;
		delete $rootScope.applet.model;
		delete $rootScope.applet.view;
  };

  function showApplet() {
		root.appletModal.show();
  };

  function hideApplet() {
		// Pop the skin containing the applet off the stack (re-apply prior skin).
	  themeService.popSkin();
		$css.removeAll();
		removeAppletProperties();
    root.appletModal.remove();
  };

	function isAppletWallet(applet) {
		return applet.header.appletId.includes(APPLET_WALLET_IDENTIFIER_PREFIX);
	};

	function isAppletBuiltin(applet) {
		return applet.header.appletId.includes(APPLET_BUILTIN_IDENTIFIER_PREFIX);
	};

  // Creates an applet schema from wallet credentials.
  function createWalletAppletSchema(credentials) {
    var config = configService.getSync();
		config.aliasFor = config.aliasFor || {};
  	var walletSkin = themeService.getPublishedSkinForWalletId(credentials.walletId);
  	return {
	    "header": {
	      "appletId": APPLET_WALLET_IDENTIFIER_PREFIX + credentials.walletId,
	      "name": config.aliasFor[credentials.walletId] || credentials.walletName,
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
	      "appletId": capability.id,
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

  // TODO: remove this behavior when the builtin capabilities are implmented as real applets.
  function getBuiltinApplets() {
  	var builtinApplets = [];
  	// Glidera
  	builtinApplets.push(new Applet(createBuiltinAppletSchema({
  		id: APPLET_BUILTIN_IDENTIFIER_PREFIX + 'glidera',
  		name: 'Glidera',
  		uri: 'glidera',
  		launchIconBackground: 'url(img/glidera-icon.png) center / cover no-repeat #FFFFFF',
  	})));
  	return builtinApplets;
  };

  function openApplet(applet) {
  	// Create a session id for the applet.
  	appletSessionService.createSession(applet, function(session) {

      $rootScope.$emit('Local/AppletEnter', applet, FocusedWallet.getWalletId());

      // Apply the skin containing the applet.
      themeService.setAppletByNameForWallet(applet.header.name, FocusedWallet.getWalletId(), function() {
        initAppletEnvironment(applet);

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
              <div ng-include="\'' + root.appletMainViewUrl + '\'" ng-init="sessionId=\'' + session.id + '\'">\
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
          showApplet();
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
    return walletApplets.concat(builtinApplets).concat(applets);
  };

	root.getApplet = function() {
	  return themeService.getCurrentSkin().getApplet();
	};

	root.appletPath = function(uri) {
		var path = '';
		var applet = root.getApplet();
		if (applet) {
	  	path = root.getApplet().path(uri);
	  }
	  return path;
	};

  root.doOpenApplet = function(applet) {
  	if (isAppletWallet(applet)) {
  		openWallet(applet.model.walletId);
  	} else if (isAppletBuiltin(applet)) {
  		openCapability(applet.model.uri);
  	} else {
  		openApplet(applet);
  	}
  };

  root.doCloseApplet = function(sessionId) {
    $rootScope.$emit('Local/AppletLeave', appletSessionService.getSession(sessionId).getApplet(), FocusedWallet.getWalletId());
    appletSessionService.getSession(sessionId).getApplet().finalize(function() {
      hideApplet();
      appletSessionService.destroySession(sessionId);
    });
  };

  $rootScope.$on('modal.shown', function(event, modal) {
  	$rootScope.$emit('Local/AppletShown', modal.session.getApplet(), modal.walletId);
		$rootScope.applet.ready = true;
  });

  $rootScope.$on('modal.hidden', function(event, modal) {
  	$rootScope.$emit('Local/AppletHidden', modal.session.getApplet(), modal.walletId);
		$rootScope.applet.ready = false;
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

  return root;
});
