'use strict';

angular.module('copayApp.services').factory('appletService', function($rootScope, $log, $timeout, $css, $ionicModal, $ionicPopover, lodash, Applet, Skin, PluginRegistry, profileService, configService, appletCatalogService, appletSessionService, themeService, Wallet, FocusedWallet, Constants, go) {

  var APPLET_IDENTIFIER_WALLET_PREFIX = 'com.bitpay.copay.applet.wallet.';
  var PLUGIN_IDENTIFIER_WALLET_PREFIX = 'com.bitpay.copay.plugin.wallet.';
  var APPLET_IDENTIFIER_BUILTIN_PREFIX = 'com.bitpay.copay.applet.builtin.';
  var PLUGIN_IDENTIFIER_BUILTIN_PREFIX = 'com.bitpay.copay.plugin.builtin.';

  // Applet preferences default values.
  // 
  var DEFAULT_APPLET_PREFS_VISIBLE = true;
  var DEFAULT_APPLET_PREFS_CATEGORY = 'Unknown';

	var root = {};
  root.initialized = false;
  root.appletsWithStateCache = [];
  root.appletsWithStateCacheValid = false;
  root.activeCategory = {};

  function publishAppletFunctions() {
    $rootScope.applet = $rootScope.applet || {};
		$rootScope.applet.close = function(sessionId) { return root.doCloseApplet(sessionId); };
		$rootScope.applet.open = function(applet) { return root.doOpenApplet(applet); };
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
  function createWalletAppletSchema(credentials, wallet) {
    wallet = wallet || {};
    var config = configService.getSync();
		config.aliasFor = config.aliasFor || {};
  	var walletSkin = themeService.getPublishedSkinForWalletId(credentials.walletId);
    var launchIconBackground = 'url(' + themeService.getCurrentTheme().header.path + '/applet-icons/wallet.png) 50% 50% / cover no-repeat rgba(0, 0, 0, 0)';
  	return {
	    "header": {
        "appletId": APPLET_IDENTIFIER_WALLET_PREFIX + credentials.walletId,
        "pluginId": PLUGIN_IDENTIFIER_WALLET_PREFIX + credentials.walletId,
	      "name": config.aliasFor[credentials.walletId] || credentials.walletName,
        "description": 'A bitcoin wallet.',
        "flags": Applet.FLAGS_ALL
      },
      "category": {
        "primary": 'Wallet',
        "secondary": ''
      },
	    "model": {
	      "isoCode": config.wallet.settings.unitName == 'bits' || config.wallet.settings.unitName == 'BTC' ? 'XBT' : config.wallet.settings.alternativeIsoCode,
	      "unitName": config.wallet.settings.unitName,
	      "m": credentials.m,
	      "n": credentials.n,
	      "network": credentials.network,
	      "walletId": credentials.walletId,
        "balance": (wallet.status ? wallet.getBalanceAsString('totalAmount') + ' (' + wallet.getBalanceAsString('totalAmount', true) + ')': '---')
	    },
	    "view": {
        "avatarColor": walletSkin.view.avatarColor,
        "avatarBackground": walletSkin.view.avatarBackground,
        "avatarBorder": walletSkin.view.avatarBorderSmall,
        "launchIconBackground": launchIconBackground
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
        "name": capability.name,
        "description": capability.description,
        "flags": capability.flags
      },
      "category": {
        "primary": capability.category.primary,
        "secondary": capability.category.secondary
      },
	    "model": {
        "uri": capability.uri
	    },
	    "view": {
	      "launchIconBackground": capability.launchIconBackground
	    },
	    "services" : []
	  }
  };

  function getWalletsAsApplets() {
		var credentials = lodash.filter(profileService.profile.credentials, 'walletName');
    var walletApplets = lodash.map(credentials, function(c) {
      // Get the wallet status for balance etc. information.
      var walletStatus;

      if (!lodash.isUndefined(profileService.walletClients[c.walletId])) {
        var wallet = new Wallet(profileService.walletClients[c.walletId]);

        wallet.getStatus(function(err, status) {
          var walletApplet = new Applet(createWalletAppletSchema(c, wallet), null);
          $rootScope.$emit('Local/WalletAppletUpdated', walletApplet);
        });
      }
    	return new Applet(createWalletAppletSchema(c), null);
    });
    return lodash.sortBy(walletApplets, 'header.name');
  };

  function getBuiltinApplets() {
    var builtinApplets = [];
    var iconPath = themeService.getCurrentTheme().header.path + '/applet-icons/';
    var config = configService.getSync();

    // Create wallet
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'create-wallet',
      name: 'Create Wallet',
      description: 'Create a new personal or shared wallet.',
      category: {
        primary: 'Wallet Utilities',
        secondary: ''
      },
      uri: 'create',
      launchIconBackground: 'url(' + iconPath + 'wallet-new.png) center / cover no-repeat rgba(0,0,0,0)',
      flags: Applet.FLAGS_ALL | Applet.FLAGS_MAY_NOT_HIDE
    })));

    // Join wallet
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'join-wallet',
      name: 'Join Wallet',
      description: 'Join a shared wallet.',
      category: {
        primary: 'Wallet Utilities',
        secondary: ''
      },
      uri: 'join',
      launchIconBackground: 'url(' + iconPath + 'wallet-join.png) center / cover no-repeat rgba(0,0,0,0)',
      flags: Applet.FLAGS_ALL | Applet.FLAGS_MAY_NOT_HIDE
    })));

    // Import wallet
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'import-wallet',
      name: 'Import Wallet',
      description: 'Import a wallet from backup.',
      category: {
        primary: 'Wallet Utilities',
        secondary: ''
      },
      uri: 'import',
      launchIconBackground: 'url(' + iconPath + 'wallet-import.png) center / cover no-repeat rgba(0,0,0,0)',
      flags: Applet.FLAGS_ALL | Applet.FLAGS_MAY_NOT_HIDE
    })));

    // Global preferences
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'prefs-global',
      name: 'Settings',
      description: 'Global preferences.',
      category: {
        primary: 'Wallet Utilities',
        secondary: ''
      },
      uri: 'preferencesGlobal',
      launchIconBackground: 'url(' + iconPath + 'settings.png) center / cover no-repeat rgba(0,0,0,0)',
      flags: Applet.FLAGS_ALL | Applet.FLAGS_MAY_NOT_HIDE
    })));

  	// Glidera
  	builtinApplets.push(new Applet(createBuiltinAppletSchema({
  		id: 'glidera',
  		name: 'Glidera',
      description: 'Buy or sell bitcoin.',
      category: {
        primary: 'Finance',
        secondary: ''
      },
  		uri: 'glidera',
  		launchIconBackground: 'url(' + iconPath + 'glidera.png) center / cover no-repeat rgba(0,0,0,0)',
      flags: Applet.FLAGS_ALL
  	})));

    // Coinbase
    builtinApplets.push(new Applet(createBuiltinAppletSchema({
      id: 'coinbase',
      name: 'Coinbase',
      description: 'Buy or sell bitcoin.',
      category: {
        primary: 'Finance',
        secondary: ''
      },
      uri: 'coinbase',
      launchIconBackground: 'url(' + iconPath + 'coinbase.png) center / cover no-repeat rgba(0,0,0,0)',
      flags: Applet.FLAGS_ALL
    })));
  	return builtinApplets;
  };

  function openApplet(applet) {
  	// Create a session id for the applet.
  	appletSessionService.createSession(applet, function(session) {

      var wallet = FocusedWallet.getInstance();
      $rootScope.$emit('Local/AppletEnter', applet, wallet.getWalletId());

      // Apply the skin containing the applet.
      themeService.setAppletByNameForWallet(applet.header.name, wallet.getWalletId(), function() {
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
                      <span class="section">' + (wallet.getInfo().client.alias || wallet.getInfo().client.credentials.walletName || "---") + '</span>\
                    </div>\
                    <div class="item item-text-wrap">\
                      <span class="text">' + (wallet.getBalanceAsString('totalAmount', false) || '--- ' + wallet.getInfo().config.settings.unitName) + '</span><br>\
                      <span class="text">' + (wallet.getBalanceAsString('totalAmount', true) || '--- ' +  wallet.getInfo().config.settings.alternativeIsoCode) + '</span>\
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
          walletId: wallet.getWalletId(),
          name: 'applet'
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
    var wallet = FocusedWallet.getInstance();
  	if (walletId != wallet.getWalletId()) {
	    profileService.setAndStoreFocus(walletId, function() {});
	  }
  };

  function openCapability(uri) {
    go.path(uri);
  };

  // Return the collection of all available applets.
  function getApplets() {
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

  function cacheAppletsWithState(applets) {
    root.appletsWithStateCache = applets;
    root.appletsWithStateCacheValid = true;
    $rootScope.$emit('Local/AppletsWithStateUpdated', applets);
  };

  function invalidateAppletsWithStateCache() {
    root.appletsWithStateCache = [];
    root.appletsWithStateCacheValid = false;
    $rootScope.$emit('Local/AppletsWithStateUpdated');
  };

  root.isInitialized = function() {
    return root.initialized;
  };

	root.init = function(callback) {
		if (appletCatalogService.supportsWriting()) {
      appletCatalogService.init(function() {

				publishAppletFunctions();
        root.getAppletsWithState();
        root.initialized = true;
        $log.debug('Applet service initialized');
				callback();

      });
    } else {
      var err = 'Fatal: Applet service initilization - device does not provide storage for applets';
      $rootScope.$emit('Local/DeviceError', err);
      return;
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

  // Return applets after applying persistent state. Result may be filtered.
  // filter: {
  //   category: category object,
  //   visible: true | false
  // }
  root.getAppletsWithState = function(filter) {
    if (!root.initialized) return;
    filter = filter || {};

    // Return cache if valid.
    if (lodash.isEmpty(filter) && root.appletsWithStateCacheValid) {
      return root.appletsWithStateCache;
    }

    var catalog = appletCatalogService.getSync();
    var appletState = catalog.appletState;
    var decoratedApplets;

    // Get all of the applets.
    var applets = getApplets();

    // Find and add the applet layout and preferences to each applet object.
    decoratedApplets = lodash.map(applets, function(applet) {

      var state = lodash.find(appletState, function(state) {
        return state.appletId == applet.header.appletId;
      });

      state = state || {};
      state.preferences = state.preferences || {};
      applet.preferences = applet.preferences || {};

      // Apply layout.
      // 
      switch (catalog.environment.presentation) {
        case Constants.LAYOUT_CATEGORIES:
          if (!lodash.isUndefined(state.layoutCategoryList)) {
            applet.layout = state.layoutCategoryList;
          }
          break;
        case Constants.LAYOUT_DESKTOP:
          if (!lodash.isUndefined(state.layoutDesktop)) {
            applet.layout = state.layoutDesktop;
          }
          break;
        case Constants.LAYOUT_LIST:
          if (!lodash.isUndefined(state.layoutList)) {
            applet.layout = state.layoutList;
          }
          break;
        default:
          $log.debug('Error: invalid applet layout, skipping application of layout');
      }

      // Apply preferences from state or set default value.
      // 
      // Visible - whether or not the applet is displayed in the UI.
      applet.preferences.visible = (!lodash.isUndefined(state.preferences.visible) ? state.preferences.visible : DEFAULT_APPLET_PREFS_VISIBLE);

      // Category - the user assigned category (defaults to marketing category or unknown).
      if (!lodash.isUndefined(state.preferences.category) && !lodash.isEmpty(state.preferences.category)) {
        applet.preferences.category = state.preferences.category;
      } else if (!lodash.isUndefined(applet.category) && !lodash.isEmpty(applet.category)) {
        applet.preferences.category = applet.category.primary;
      } else if (!lodash.isUndefined(applet.skin.header.category) && !lodash.isEmpty(applet.skin.header.category)) {
        applet.preferences.category = applet.skin.header.category.primary;
      } else {
        applet.preferences.category = DEFAULT_APPLET_PREFS_CATEGORY;
      }

      return applet;
    });

    // Apply filters.
    if (!lodash.isEmpty(filter)) {

      // Category filter - if there is a active category then remove applets not in the category.
      var categoryFilter = filter.category || {};

      if (!lodash.isEmpty(categoryFilter)) {
        decoratedApplets = lodash.filter(decoratedApplets, function(applet) {
          return categoryFilter.header.name == applet.preferences.category;
        });
      }

      // Visibility filter - remove applets that are not visible.
      var visibilityFilter = filter.visible || false;

      if (visibilityFilter) {
        decoratedApplets = lodash.filter(decoratedApplets, function(applet) {
          return applet.preferences.visible;
        });
      }
    }

    // Cache the result.
    cacheAppletsWithState(applets);

    return decoratedApplets;
  };

  // Return the collection of all in-use applet categories.
  root.getAppletCategoriesWithState = function(filter) {
    if (!root.initialized) return;
    filter = filter || {};
    var catalog = appletCatalogService.getSync();
    var iconPath = themeService.getCurrentTheme().header.path + '/category-icons/';

    // Get all of the visible applets.
    var applets = root.getAppletsWithState({
      visible: true
    });
    applets = lodash.filter(applets, function(applet) {
      return applet.preferences.visible;
    });

    var categoryState = catalog.categoryState || [];

    // Create a set of categories from applets.
    var categories = lodash.map(applets, function(applet) {

      var categoryName = applet.preferences.category;

      var state = lodash.find(categoryState, function(state) {
        return state.categoryName == categoryName;
      });
      state = state || {};

      // Try to use an icon for the category, use default icon otherwise.
      var iconBackground = 'url(\'' + iconPath + categoryName.replace(/[^a-zA-Z0-9]/g, "") + '.png\') center / cover no-repeat';
      iconBackground += ', url(\'' + iconPath + 'default.png\') center / cover no-repeat rgba(0,0,0,0)';

      return {
        header: {
          name: categoryName
        },
        layout: state.layout,
        view: {
          iconBackground: iconBackground
        }
      }
    });

    // Get the number of applets in each category.
    var counts = lodash.countBy(categories, function(cat) {
      return cat.header.name;
    });

    // Remove duplicates and sort (sorting is only effective before categories are assigned positions in the grid).
    categories = lodash.sortBy(lodash.uniq(categories, 'header.name'), 'header.name');

    // Map the category applet count into each category.
    categories = lodash.map(categories, function(cat) {
      cat.header.count = counts[cat.header.name];
      return cat;
    });

    // Apply filters.
    if (!lodash.isEmpty(filter)) {

      // Category filter - if there is a active category then remove applets not in the category.
      var nameFilter = filter.name || {};

      if (!lodash.isEmpty(nameFilter)) {
        categories = lodash.filter(categories, function(category) {
          return nameFilter == category.header.name;
        });
      }
    }

    return categories;
  };

  // Update applet states with the specified array of new states.
  root.updateAppletEnvironment = function(newEnvironment, callback) {
    var cat = {
      environment: {}
    }
    cat.environment = newEnvironment;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
      if (callback) {
        callback();
      }
    });
  };

  // Update category states with the specified array of new states.
  root.updateCategoryState = function(categories, opts, callback) {
    opts = opts || {};
    var catalog = appletCatalogService.getSync();
    var updatedCategoryState = catalog.categoryState;

    // Create the state objects from each category.
    var newState = lodash.map(categories, function(category) {
      return {
        categoryName: category.header.name,
        layout: category.layout
      }
    });

    for (var i = 0; i < newState.length; i++) {

      var existingState = lodash.find(updatedCategoryState, function(state){
        return state.categoryName == newState[i].categoryName;
      });

      if (lodash.isUndefined(existingState)) {
        // No existing category state, create a new one.
        updatedCategoryState.push(newState[i]);

      } else {
        // Update existing applet state.
        lodash.assign(existingState, newState[i]);
      }
    }

    var cat = {
      categoryState: []
    };

    cat.categoryState = updatedCategoryState;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
      if (callback) {
        callback();
      }
    });
  };

  root.updateAppletState = function(applets, opts, callback) {
    opts = opts || {};
    var catalog = appletCatalogService.getSync();
    var updatedAppletState = catalog.appletState;

    // Build the applet state object for each applet.
    var newState = lodash.map(applets, function(applet) {

      var state = {
        appletId: applet.header.appletId,
        preferences: {
          visible: applet.preferences.visible,
          category: applet.preferences.category
        }
      }

      switch(opts.layout) {
        case Constants.LAYOUT_DESKTOP:
          state.layoutDesktop = applet.layout;
          break;
        case Constants.LAYOUT_LIST:
          state.layoutList = applet.layout;
          break;
        case Constants.LAYOUT_CATEGORIES:
          state.layoutCategoryList = applet.layout;
          break;
        case '':
          // Ignore when no layout option is provided.
          break;
        default:
          $log.error('Error: invalid layout specified (' + opts.layout + '), not updating applet state layout');
      }

      return state;
    });

    for (var i = 0; i < newState.length; i++) {

      var existingState = lodash.find(updatedAppletState, function(state){
        return state.appletId == newState[i].appletId;
      });

      if (lodash.isUndefined(existingState)) {
        // No existing applet state, create a new one.
        updatedAppletState.push(newState[i]);

      } else {
        // Update existing applet state.
        lodash.assign(existingState, newState[i]);
      }
    }

    var cat = {
      appletState: []
    };

    cat.appletState = updatedAppletState;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      // Invalidate the cache after updates.
      invalidateAppletsWithStateCache();

      if (callback) {
        callback();
      }
    });
  };

  root.createCategory = function(name, callback) {
    var iconPath = themeService.getCurrentTheme().header.path + '/category-icons/';

    var category = {
      header: {
        name: name
      },
      layout: {position:{'0':9999,'1':9999}},
      view: {
        iconBackground: 'url(' + iconPath + name.replace(/[^a-zA-Z0-9]/g, "") + '.png) center / cover no-repeat rgba(0,0,0,0)'
      }
    };

    root.updateCategoryState([category], {}, callback);

    return root.getAppletCategoriesWithState({
      name: categoryName
    });
  };

  root.getActiveCategory = function() {
    return root.activeCategory;
  };

  root.setActiveCategory = function(category) {
    root.activeCategory = category;
    $rootScope.$emit('Local/AppletCategoryUpdated', category);
  };

  root.setActiveCategoryByName = function(categoryName) {
    var categories = root.getAppletCategoriesWithState({
      name: categoryName
    });
    if (categories.length >= 0) {
      root.setActiveCategory(categories[0]);
    } else {
      $log.error('Error: could not set active category to \'' + categoryName + '\', category name not found');
    }
  };

  root.clearActiveCategory = function() {
    root.activeCategory = {};
    $rootScope.$emit('Local/AppletCategoryCleared');
  };

  root.doOpenApplet = function(applet) {
    $log.info('Opening applet: ' + applet.header.name);
  	if (root.isAppletWallet(applet)) {
  		openWallet(applet.model.walletId);
  	} else if (root.isAppletBuiltin(applet)) {
  		openCapability(applet.model.uri);
  	} else {
  		openApplet(applet);
  	}
  };

  root.doCloseApplet = function(sessionId) {
    var wallet = FocusedWallet.getInstance();
    var session = appletSessionService.getSession(sessionId);
    var applet = session.getApplet();
    $log.info('closing applet: ' + applet.header.name);

    $rootScope.$emit('Local/AppletLeave', applet, wallet.getWalletId());
    hideApplet(session);
    applet.finalize(function() {
      appletSessionService.destroySession(session.id);
    });
  };

  $rootScope.$on('modal.shown', function(event, modal) {
    if (modal.name != 'applet') return;
  	$rootScope.$emit('Local/AppletShown', modal.session.getApplet(), modal.walletId);
  });

  $rootScope.$on('modal.hidden', function(event, modal) {
    if (modal.name != 'applet') return;
  	$rootScope.$emit('Local/AppletHidden', modal.session.getApplet(), modal.walletId);
  });

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
