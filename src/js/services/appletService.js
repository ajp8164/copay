'use strict';

angular.module('copayApp.services').factory('appletService', function($rootScope, $log, $timeout, $css, $ionicModal, lodash, Applet, AppletSession, Skin, profileService, configService, appletCatalogService, themeService, FocusedWallet, go) {

	var APPLET_WALLET_IDENTIFIER_PREFIX = 'wallet-applet.';
	var APPLET_BUILTIN_IDENTIFIER_PREFIX = 'builtin-applet.';

	var root = {};
  root.initialized = false;

	// Session.
	// Use of the session ID prevents applets from gaining access to other applets data.
	// A random applet session ID is provided to the applet on launch. This ID must be provided by the applet in
	// api calls made by the applet. Prior to executing the api call the session ID is validated.  If the session ID
	// is not valid then the api call is not executed and an error is thrown.
	// 
	root._appletSessionPool = [];

  function initAppletEnvironment() {
		var applet = root.getApplet();
		publishAppletProperties(applet);

		// Set the applet main view.
		// 
  	root.appletMainViewUrl = applet.mainViewUrl();

  	// Bind stylesheet(s) for this applet.
  	// 
  	applet.stylesheets().forEach(function(stylesheet) {
		  $css.bind({ 
		    href: stylesheet
		  }, $rootScope);
  	});
  };

  function publishAppletFunctions() {
		$rootScope.applet = {
			close: function() { return root.doCloseApplet(); },
			open: function(applet) { return root.doOpenApplet(applet); },
			path: function(uri) { return root.appletPath(uri); }
		};
  };

  function publishAppletProperties(applet) {
		$rootScope.applet.header = applet.header;
		$rootScope.applet.model = applet.model;
		$rootScope.applet.view = applet.view;
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

  function createSession(applet) {
    var existingSessionIndex = lodash.findIndex(root._appletSessionPool, function(session) {
      return (session.isForApplet(applet));
    });

    if (existingSessionIndex >= 0) {
    	// Session state error; found an existing session for the applet.
    	// Quietly remove the existing state.
    	var removedSession = lodash.pullAt(root._appletSessionPool, existingSessionIndex);
    	removedSession = removedSession[0];
    	$log.debug('Applet session state error - forcibly removed session: ' + removedSession.id + ' (applet ID: ' + removedSession.applet.header.appletId + ')');
    } else {
    	// Create a new session.
    	var newSession = new AppletSession(applet);
	  	root._appletSessionPool.push(newSession);
    	$log.debug('Applet session created: ' + newSession.id + ' (applet ID: ' + newSession.applet.header.appletId + ')');
	  }
  };

  function destroySession(applet) {
    var existingSessionIndex = lodash.findIndex(root._appletSessionPool, function(session) {
      return (session.isForApplet(applet));
    });

    if (existingSessionIndex >= 0) {
    	var removedSession = lodash.pullAt(root._appletSessionPool, existingSessionIndex);
    	removedSession = removedSession[0];
    	removedSession.flush(function(err, data) {
    		if (err) {
		    	$log.debug('Error while writing applet session data during applet close: ' + err.message + ' (applet ID: ' + removedSession.applet.header.appletId + '), session was closed anyway, session data was lost');
    		}
	    	$log.debug('Applet session successfully removed: ' + removedSession.id + ' (applet ID: ' + removedSession.applet.header.appletId + ')');
    	});
    } else {
    	$log.debug('Warning: applet session not found for removal: ' + removedSession.id + ' (applet ID: ' + removedSession.applet.header.appletId + ')');
	  }
  };

  function openApplet(applet) {
  	// Create a session id for the applet.
  	createSession(applet);

  	// Apply the skin containing the applet.
    themeService.setAppletByNameForWallet(applet.header.name, FocusedWallet.getWalletId(), function() {
	  	initAppletEnvironment();

	  	// Create the applet modal.
	  	// 
			root.appletModal = $ionicModal.fromTemplate('\
				<ion-modal-view class="applet-modal">\
	 			  <ion-nav-bar class="bar-positive" ng-style="{\'color\': applet.view.navBarTitleColor, \'background\': applet.view.navBarBackground, \'border-bottom\': applet.view.navBarBottomBorder}">\
	 			  <div ng-style="{\'background\': applet.view.navBarBackground}">\
				  	<ion-nav-title>{{applet.title || skin.header.name}}</ion-nav-title>\
				  	<ion-nav-buttons side="right">\
	    				<button class="button button-icon button-applet-header icon ion-close" ng-click="applet.close()" ng-style="{\'color\': applet.view.navBarButtonColor}"></button>\
						</ion-nav-buttons>\
					</div>\
			  	</ion-nav-bar>\
					<ion-content class="has-header" ng-style="{\'background\': applet.view.background}">\
						<div ng-include=\"\'' + root.appletMainViewUrl + '\'\">\
					</ion-content>\
				</ion-modal-view>\
				', {
				scope: $rootScope,
				backdropClickToClose: false,
				hardwareBackButtonClose: false,
	      animation: 'animated zoomIn',
	      hideDelay: 1000,
	      applet: applet,
	      walletId: FocusedWallet.getWalletId()
	    });

			// Present the modal, allow some time to render before presentation.
			$timeout(function() {
				showApplet(applet)
	    }, 50);
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

  root.getSession = function(applet) {
    return lodash.find(root._appletSessionPool, function(session) {
      return (session.isForApplet(applet));
    });
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

  root.doCloseApplet = function() {
		$timeout(function() {
			var applet = root.getApplet();
			hideApplet();
			destroySession(applet);
    });
  };

  $rootScope.$on('modal.shown', function(event, modal) {
  	$rootScope.$emit('Local/AppletShown', modal.applet, modal.walletId);
		$rootScope.applet.ready = true;
  });

  $rootScope.$on('modal.hidden', function(event, modal) {
  	$rootScope.$emit('Local/AppletHidden', modal.applet, modal.walletId);
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
