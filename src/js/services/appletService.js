'use strict';

angular.module('copayApp.services').factory('appletService', function($rootScope, $log, $timeout, $css, $ionicModal, lodash, Applet, Skin, profileService, configService, themeCatalogService, themeService, FocusedWallet, go) {

	var APPLET_WALLET_IDENTIFIER = 'wallet-applet';
	var APPLET_BUILTIN_IDENTIFIER = 'builtin-applet';

	var root = {};
	root._userPropertyKeys = [];

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
		for (var i = 0; i < root._userPropertyKeys.length; i++) {
  		delete $rootScope.applet[root._userPropertyKeys[i]];
		}
  	root._userPropertyKeys = [];
  };

  function showApplet(applet) {
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
		return applet.header.id == APPLET_WALLET_IDENTIFIER;
	};

	function isAppletBuiltin(applet) {
		return applet.header.id == APPLET_BUILTIN_IDENTIFIER;
	};

  // Creates an applet schema from wallet credentials.
  function createWalletAppletSchema(credentials) {
    var config = configService.getSync();
		config.aliasFor = config.aliasFor || {};
  	var walletSkin = themeService.getPublishedSkinForWalletId(credentials.walletId);
  	return {
	    "header": {
	      "id": APPLET_WALLET_IDENTIFIER,
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
	      "id": capability.id,
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
  		id: APPLET_BUILTIN_IDENTIFIER,
  		name: 'Glidera',
  		uri: 'glidera',
  		launchIconBackground: 'url(img/glidera-icon.png) center / cover no-repeat #FFFFFF',
  	})));
  	return builtinApplets;
  };

  function openApplet(applet) {
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
		// Publish applet functions to $rootScope.
		// 
		publishAppletFunctions();
		callback();
		$log.debug('Applet service initialized');
	};

  // Return the collection of applets.
  root.getApplets = function() {
		var walletApplets = getWalletsAsApplets();
    var applets = lodash.map(themeService.getAppletSkins(), function(skin) {
      return new Skin(skin).getApplet();
    });
    var builtinApplets = getBuiltinApplets();
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
			hideApplet();
    });
  };

	root.setProperty = function(key, value) {
		$rootScope.applet[key] = value;
		root._userPropertyKeys.push(key);
	};

	root.setUserProperty = function(key, value) {
		$rootScope.applet.u[key] = value;
		root._userPropertyKeys.push(key);
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
    var catalog = themeCatalogService.getSync();
    return catalog.appletLayout;
  };

  root.saveAppletsLayout = function(layout, callback) {
    var cat = {
      appletLayout: {}
    };

    cat.appletLayout = layout;

		themeCatalogService.replace(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
    });
  };

  return root;
});
