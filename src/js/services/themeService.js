'use strict';

angular.module('copayApp.services').factory('themeService', function($rootScope, $log, $http, $timeout, $q, configService, themeCatalogService, Theme, Skin, lodash, notification, gettextCatalog, brand) {

  // The $rootScope is used to track theme and skin objects.  Views reference $rootScope for rendering.
  // 
  // The following $rootScope objects are built out of the application configuration (managed by the themeCatalogService) and hard-coded (builtin) objects.
  // 
  // $rootScope.theme   - an array of all themes known to this application (builtin + imported)
  // $rootScope.themeId - the numeric, ordinal id for the currently applied theme
  // $rootScope.theme   - the current theme object being rendered and used by the application
  // $rootScope.skinId  - the numeric, ordinal id for the currently applied skin
  // $rootScope.skin    - the current skin object being rendered and used by the application
  // 
  // "discovered" objects are used as a cache prior to importing them into this application; only the "discovery" views reference the "discovered" objects.
  // 
  // $rootScope.discoveredThemeHeaders - an array of all theme headers discovered on a connected theme server
  // $rootScope.discoveredSkinHeaders  - an array of all skin headers discovered on a connected theme server; these skin headers correspond only to the current theme ($rootScope.theme)
  // 

  var root = {};
  root.initialized = false;
  root.walletId = 'NONE';

  var MAX_SKIN_HISTORY = 5;
  root.skinHistory = [];

  root._theme = function() {
    return root._themeById(root._currentThemeId());
  };

  root._themes = function() {
    var catalog = themeCatalogService.getSync();
    return catalog.themes;
  };

  root._themeById = function(themeId) {
    var catalog = themeCatalogService.getSync();
    return catalog.themes[themeId];
  };

  root._currentThemeName = function() {
    var config = configService.getSync();
    return config.theme.name;
  };

  root._currentThemeId = function() {
    var catalog = themeCatalogService.getSync();
    return lodash.findIndex(catalog.themes, function(theme) {
      return theme.header.name == root._currentThemeName();
    });
  };

  root._currentSkinName = function() {
    var config = configService.getSync();
    return config.theme.skinFor[root.walletId];
  };

  root._currentSkinId = function() {
    return root._currentSkinIdForWallet(root.walletId);
  };

  root._currentSkinIdForWallet = function(walletId) {
    var config = configService.getSync();
    var skinId = root._theme().header.defaultSkinId;
    if (config.theme.skinFor != undefined && config.theme.skinFor[walletId] != undefined) {
      var foundSkinId = lodash.findIndex(root._theme().skins, function(skin) {
        return skin.header.name == config.theme.skinFor[walletId];
      });
      skinId = (foundSkinId < 0 ? skinId : foundSkinId);
    }
    return skinId;
  };

  root._get = function(endpoint) {
    var catalog = themeCatalogService.getSync();
    $log.debug('GET ' + encodeURI(catalog.service.url + endpoint));
    return {
      method: 'GET',
      url: encodeURI(catalog.service.url + endpoint),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
  };

  root._get_local = function(endpoint) {
    $log.debug('GET ' + themeCatalogService.getApplicationDirectory() + endpoint);
    return {
      method: 'GET',
      url: themeCatalogService.getApplicationDirectory() + endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
  };

  var _post = function(endpoint, data) {
    var catalog = themeCatalogService.getSync();
    $log.debug('POST ' + encodeURI(catalog.service.url + endpoint) + ' data = ' + JSON.stringify(data));
    return {
      method: 'POST',
      url: encodeURI(catalog.service.url + endpoint),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: data
    };
  };

  root._encodeURI =function(str) {
    return encodeURI(str).replace(/[:]/g, function(c) {  // These chars cannot be in a path
      return '';
    }).replace(/[']/g, function(c) {
      return '%' + c.charCodeAt(0).toString(16);  // Encode these chars specifically
    });
  };

  // Return the relative resource path for the specified theme.
  root._getThemeResourcePath = function(themeName) {
    return '/themes/' + themeName;
  };

  // Return the absolute resource url for the specified theme.
  // This value is always local.
  root._getLocalThemeResourceUrl = function(themeName) {
    return themeCatalogService.getApplicationDirectory() + root._encodeURI(root._getThemeResourcePath(themeName));
  };

  // Return the relative resource path for the specified theme's skin.
  root._getSkinResourcePath = function(themeName, skinName) {
    return '/themes/' + themeName + '/skins/' + skinName;
  };

  // Return the absolute resource url for the specified theme's skin.
  // This value is always local.
  root._getLocalSkinResourceUrl = function(themeName, skinName) {
    return themeCatalogService.getApplicationDirectory() + root._encodeURI(root._getSkinResourcePath(themeName, skinName));
  };

  // Get the skin index for the specified skinName in the theme.
  // Return the index for appending the skin if the theme does not have a skin named skinName.
  root._getSkinIndex = function(theme, skinName) {
    var index = theme.skins.length;
    for (var i = 0; i < theme.skins.length; i++) {
      if (theme.skins[i].header.name == skinName) {
        index = i;
        break;
      }
    }
    return index;
  };

  // Read the provided theme definition (from the brand configuration) and push it to the $rootScope.
  // Doing this makes the theme and skin available for the UI.
  root._bootstrapTheme = function(themeDef, callback) {
    $http(root._get_local(root._getThemeResourcePath(themeDef.theme) + '/theme.json')).then(function successCallback(response) {

      // Initialize the theme.
      // 
      var themeJSON = JSON.stringify(response.data);
      var themeResourceUrl = root._getLocalThemeResourceUrl(themeDef.theme);

      themeJSON = themeJSON.replace(/<theme-path>/g, themeResourceUrl);
      var theme = JSON.parse(themeJSON);

      // Replace resource tags with paths.
      for (var n = 0; n < theme.resources.length; n++) {
        var re = new RegExp('<resource-' + n + '>', 'g');
        themeJSON = themeJSON.replace(re, theme.resources[n]);
      }
      theme = JSON.parse(themeJSON);

      // The resources attribute is no longer needed.
      delete theme.resources;

      var defaultSkinName = theme.header.defaultSkinName;

      $rootScope.themes = [];
      $rootScope.themes[0] = lodash.cloneDeep(theme);
      $rootScope.themeId = 0;
      $rootScope.theme = $rootScope.themes[$rootScope.themeId];

      // Initialize the skins.
      // 
      var promises = [];
      for (var i = 0; i < themeDef.skins.length; i++) {
        // Collect and serialize all http requests to get skin files.
        promises.push(
          $http(root._get_local(root._getSkinResourcePath(themeDef.theme, themeDef.skins[i]) + '/skin.json')).then(function successCallback(response) {

            var skin = response.data;
            var themeResourceUrl = root._getLocalThemeResourceUrl(themeDef.theme);
            var skinResourceUrl = root._getLocalSkinResourceUrl(themeDef.theme, skin.header.name);

            var skinJSON = JSON.stringify(skin);
            skinJSON = skinJSON.replace(/<theme-path>/g, themeResourceUrl);
            skinJSON = skinJSON.replace(/<skin-path>/g, skinResourceUrl);
            skin = JSON.parse(skinJSON);

            // Replace resource tags with paths.
            for (var n = 0; n < skin.resources.length; n++) {
              var re = new RegExp('<resource-' + n + '>', 'g');
              skinJSON = skinJSON.replace(re, skin.resources[n]);
            }
            skin = JSON.parse(skinJSON);

            // The resources attribute is no longer needed.
            delete skin.resources;

            $rootScope.theme.skins.push(skin);

            if (defaultSkinName == skin.header.name) {
              $rootScope.theme.header.defaultSkinId = $rootScope.theme.skins.length - 1;
            }
          }, function errorCallback(response) {
            $log.debug('Error: failed to GET ' + response.config.url + ', status: ' + response.status);
          })
        );
      }

      $q.all(promises).then(function() {
        // This is run after all of the http requests are done.
        // 
        // If there is a configuration setting then use that instead of default skin (occurs during page reload).
        var selectedSkinId = $rootScope.theme.header.defaultSkinId;

        var config = configService.getSync();
        if (root.walletId != '' && config.theme.skinFor[root.walletId]) {
          selectedSkinId = lodash.findIndex($rootScope.theme.skins, function(skin) {
            return skin.header.name == config.theme.skinFor[root.walletId];
          });

          if (selectedSkinId < 0) {
            // This can happen if the app is being upgraded with schema changes and the users configured theme/skin
            // is not in the catalog (and could be imported later in this init cycle).  For now just set default skin.
            selectedSkinId = $rootScope.theme.header.defaultSkinId;
          }
        }

        $rootScope.skinId = selectedSkinId;
        $rootScope.skin = $rootScope.theme.skins[$rootScope.skinId];

        $log.debug('Theme service bootstrapped to theme/skin: ' +
          $rootScope.theme.header.name + '/' +
          $rootScope.skin.header.name +
          (root.walletId == 'NONE' ? ' [no wallet yet]' : ' [walletId: ' + root.walletId + ']'));

        // Build the theme catalog from the bootstrapped theme and skins.
        root._buildCatalog(function() {
          if (callback) {
            callback();
          }
        });

      }, function errorCallback(error) {
        $log.debug('Error: failed to GET local skin resources, ensure your skin files are valid JSON' + (error.message ? ': \'' + error.message + '\'': ''));
      });

    }, function errorCallback(error) {
      $log.debug('Error: failed to GET local skin resources, ensure your skin files are valid JSON' + (error.message ? ': \'' + error.message + '\'': ''));
    });
  };

  root._buildCatalog = function(callback) {

    // Write the published theme and skin to the app configuration.
    var opts = {
      theme: {
        name: {},
        skinFor: {}
      }
    };

    opts.theme = {};
    opts.theme.name = $rootScope.theme.header.name;
    opts.theme.skinFor = {};
    opts.theme.skinFor[root.walletId] = $rootScope.skin.header.name;

    configService.set(opts, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      // The theme service catalog might not support writing theme content, if not then we skip writing the content
      // (in this case the theme content is available in $rootScope only; cannot import themes or skins in this case).
      if (themeCatalogService.supportsWritingThemeContent()) {

        themeCatalogService.init($rootScope.themes, function() {
         $rootScope.$emit('Local/ThemeUpdated');
          callback();
        });

      } else {

        $rootScope.$emit('Local/ThemeUpdated');
        callback();
      }
    });
  };

  root._upgradeCatalog = function(callback) {

    // Temporarily cache the old catalog so we can remember what the user had (some may have been imported).
    var oldCatalog = lodash.cloneDeep(themeCatalogService.getSync());

    // Rebuild default/built-in catalog themes[] (and skins) from brand.theme.defintion.
    // This operation sets the default theme and skin configuration.
    root._bootstrapTheme(brand.features.theme.definition, function() {

      // At this point the theme catalog has been replaced by the app bundled theme definition.
      // For each theme in the old catalog that does not yet exist in the new catalog, try to import the theme from the configured theme server.
      var newCatalog = themeCatalogService.getSync();
      var usersThemeNames = lodash.pluck(oldCatalog.themes, 'header.name');

      for (var t = 0; t < usersThemeNames.length; t++) {
        var themeName = usersThemeNames[t];

        // Check for existance.
        var themeIndex = lodash.findIndex(newCatalog.themes, function(theme) {
          return theme.header.name == themeName;
        });

        if (themeIndex < 0) {

          // The users theme was not found in our new catalog.
          // Silently attempt to import the users theme not currently in the new catalog.
          root.importTheme(themeName, false, function(theme) {
            if (lodash.isEmpty(theme)) {
              // Could not import the theme; theme was not found on the server or the server could not be reached.
              // TODO: Notify user?
              $log.debug('Theme \'' + themeName + '\' could not be imported, it was not found on the theme server or the theme server could not be reached.');
            } else {
              // Imported theme.
              // 
              // For each skin in the old catalog that does not yet exist in the new catalog, try to import the skin from the configured theme server.
              var oldTheme = lodash.find(oldCatalog.themes, {'header': {'name': themeName}});
              for (var s = 0; s < oldTheme.skins.length; s++) {
                var skinName = oldTheme.skins[s].header.name;

                // Silently attempt to import the users skin not currently in the new catalog.
                root.importSkin(themeName, skinName, false, function(skin) {
                  if (lodash.isEmpty(skin)) {
                    // Could not import the skin; skin was not found on the server or the server could not be reached.
                    // TODO: Notify user?
                    $log.debug('Skin \'' + themeName + '/' + skinName + '\' could not be imported, it was not found on the theme server or the theme server could not be reached.');
                  } else {
                    // Imported skin.
                  }
                });
              }
            }
          });
        }

        // Check and set the theme; choose the users configured theme or the default theme if users configuration is not available.
        var config = configService.getSync();
        themeIndex = lodash.findIndex(newCatalog.themes, function(theme) {
          return theme.header.name == config.theme.name;
        });

        if (themeIndex < 0) {
          // The users configured theme is not in the catalog.
          // Set the theme to the default theme (the currently published theme). This also remaps skins for all wallets.
          root.setTheme(root.getPublishedThemeId(), false, function() {
            // Done setting theme.
          });

        } else {

          // Silently set the users configured theme.
          root.setTheme(themeIndex, false, function() {
            // Done setting theme.
          });
        }
      }

      callback();
    });
  };

  // Publish the current configuration to $rootScope. Views only read from $rootScope values.
  root._publishCatalog = function(callback) {
    if (!root.initialized) {
      if (callback) {
        callback();
      }
      return;
    }
    $rootScope.themes = lodash.cloneDeep(root._themes());
    $rootScope.themeId = root._currentThemeId();
    $rootScope.theme = $rootScope.themes[$rootScope.themeId];
    $rootScope.skinId = root._currentSkinId();
    $rootScope.skin = $rootScope.theme.skins[root._currentSkinId()];
    $log.debug('Published theme/skin: '  + $rootScope.theme.header.name + '/' + $rootScope.skin.header.name + (root.walletId == 'NONE' ? ' [no wallet yet]' : ' [walletId: ' + root.walletId + ']'));
    $timeout(function() {
      $rootScope.$apply();
    });
    if (callback) {
      callback();
    }
  };

  // Push the skin id onto the top of history stack.
  root._pushSkin = function(skinId) {
    // Avoid sequential duplicates.
    if (root.skinHistory[root.skinHistory.length-1] != skinId) {
      root.skinHistory.push(skinId);
      root.skinHistory = root.skinHistory.slice(0, MAX_SKIN_HISTORY);
    }
  };

  // Remove and return the skin id from the top of the history stack.
  root._popSkin = function() {
    return root.skinHistory.pop();
  };

  root._migrateLegacyColorsToSkins = function() {

    var skinNameForColor = [
      {'#DD4B39': 'Valencia'},
      {'#F38F12': 'West Side'},
      {'#FAA77F': 'Hit Pink'},
      {'#FADA58': 'Mustard'},
      {'#9EDD72': 'Feijoa'},
      {'#77DADA': 'Aquamarine Blue'},
      {'#4A90E2': 'Havelock Blue'},
      {'#484ED3': 'Iris'},
      {'#9B59B6': 'Deep Lilac'},
      {'#E856EF': 'Purple Pizzazz'},
      {'#FF599E': 'Brilliant Rose'},
      {'#7A8C9E': 'Light Slate Gray'}
    ];

    var config = configService.getSync();
    var colorFor = config.colorFor || [];

    if (colorFor.length > 0) {
      for(var walletId in colorFor) {
        var color = colorFor[walletId];
        var skinName = root.getPublishedTheme().header.defaultSkinName;
        if (typeof skinNameForColor[color] !== 'undefined') {
          skinName = skinNameForColor[color];
        }
        $log.debug('Migrating wallet to skin... [walletId: ' + walletId + ']');
        root.setSkinByNameForWallet(skinName, walletId, true);
      }

      var opts = {
        colorFor: {}
      };

      configService.set(opts, function(err) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }
        $log.debug('Done migrating wallets to skins');
      });
    }
  };

  root._migrateThemePreferences = function() {
    var config = configService.getSync();

    // (v1.5.mtb only) Check and migrate from themeId and skin id's to names.
    if (!lodash.isUndefined(config.theme.themeId)) {
      var skinNameForId = [
        'Bison Hide',
        'Black',
        'Blue Chill',
        'Cool Grey',
        'Go Ben',
        'KU Crimson',
        'Tree Poppy',
        'Voodoo',
        'Whiskey'
      ];

      var opts = {
        theme: {
          name: {},
          skinFor: {}
        }
      };

      opts.theme.name = 'Mike Tyson Bitcoin';

      for (var walletId in config.theme.skinFor) {
        opts.theme.skinFor[walletId] = skinNameForId[config.theme.skinFor[walletId]];
      }

      configService.replace(opts, function(err) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }
        $log.debug('Theme preferences migrated successfully');
      });
    }
  };

  root._migrateViewPreferences = function() {
    var config = configService.getSync();
    var opts = {
      view: {}
    };

    opts.view = config.view;

    configService.set(opts, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
    });
  };

  ///////////////////////////////////////////////////////////////////////////////

  // init() - construct the theme catalog and publish the initial presentation.
  // 
  root.init = function(callback) {

    $log.debug('Initializing theme service...');

    // Cache the theme catalog.
    themeCatalogService.get(function(err, catalog) {
      $log.debug('Theme catalog read');
      if (err) {
        $log.debug('Error reading theme catalog');
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      // Theme service initialization depends on application configuration; force read it now.
      configService.get(function(err, config) {
        $log.debug('Preferences read');
        if (err) {
          $log.debug('Error reading preferences');
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }

        root._migrateThemePreferences();
        root._migrateViewPreferences();
        
        if (themeCatalogService.isCatalogEmpty()) {

          // Application configuration does not specify a theme.
          // Read the brand theme definition, publish, and build the catalog for the first time.
          root._bootstrapTheme(brand.features.theme.definition, function() {
            root._migrateLegacyColorsToSkins();
            root.initialized = true;
            callback();
            $log.debug('Theme service initialized');
          });

        } else {

          // Check that the catalog schema is compatible with this application.
          // 
          if (!themeCatalogService.isCatalogCompatible()) {

            root._upgradeCatalog(function() {
              root.initialized = true;
              callback();
              $log.debug('Theme service initialized');
            });

          } else {

            root.initialized = true;
            root._publishCatalog(function() {
              callback();
              $log.debug('Theme service initialized');
            });
          }
        }
      });
    });
  };

  // updateSkin() - handles updating the skin when the wallet is changed.
  // 
  root.updateSkin = function(walletId) {
    root.walletId = walletId;
    if (!root.initialized) return;
    var config = configService.getSync();
    if (config.theme.skinFor && config.theme.skinFor[root.walletId] === undefined) {
      root.setSkinForWallet(root.getPublishedThemeDefaultSkinId(), root.walletId, true);
    } else {
      root.setSkinForWallet(root.getCatalogSkinIdForWallet(root.walletId), root.walletId, true);
    }      
  };

  // setTheme() - sets the theme for the app.
  // 
  root.setTheme = function(themeId, notify, callback) {
    $log.debug('' + (themeId != root.getPublishedThemeId() ?  'Switching theme...' : 'Reapplying theme...'));
    $log.debug('' + (themeId != root.getPublishedThemeId() ? 
      'Old theme: ' + root.getPublishedThemeById(root.getPublishedThemeId()).header.name + '\n' +
      'New theme: ' + root.getPublishedThemeById(themeId).header.name :
      'Current theme: ' + root.getPublishedThemeById(themeId).header.name));

    var opts = {
      theme: {
        name: {}
      }
    };

    opts.theme.name = root.getCatalogThemeById(themeId).header.name;

    configService.set(opts, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      // Need to go through config.theme.skinFor[] and remap all skins to be compatible with the new theme
      // Example; old theme has 12 skins, new theme has 6 skins
      //   if config.theme.skinFor[walletId] = skin id 12 then it won't resolve with the new theme (since it has only 6 skins)
      //   
      // TODO: Should provide a UI for wallet-skin re-mapping using the new theme's skins
      // 
      // For now, simply force all config.theme.skinFor to the themes default skin
      //
      var config = configService.getSync();
      var opts = {
        theme: {
          skinFor: {}
        }
      };

      // For all wallets, if the configured skin does not exist on this theme then reassign to the default skin for theme.
      // Skin name is the key so if two themes have the same skin name then the skin will not be reassigned.
      for (var walletId in config.theme.skinFor) {

        var skinIndex = lodash.findIndex(root.getCatalogThemeById(themeId).skins, function(skin) {
          return skin.header.name == config.theme.skinFor[walletId];
        });

        if (skinIndex < 0) {
          // Configured skin not found, reassign the default skin.
          $log.debug('Reassigning skin for wallet: ' + walletId +
            ', new skinId: ' + root.getPublishedThemeById(themeId).header.defaultSkinId +
            ' (was skinId: ' + root.getCatalogSkinIdForWallet(walletId) + ')');

          opts.theme.skinFor[walletId] = root.getCurrentTheme().header.defaultSkinName;
        }
      }

      configService.set(opts, function(err) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }

        root._publishCatalog();

        if (callback) {
          callback();
        }

        $rootScope.$emit('Local/ThemeUpdated');
        $rootScope.$emit('Local/SkinUpdated');

        if (notify) {
          notification.success(
            gettextCatalog.getString('Success'),
            gettextCatalog.getString('Theme set to \'' + root.getPublishedTheme().header.name + '\''),
            {color: root.getPublishedSkin().view.primaryColor,
             iconColor: root.getPublishedTheme().view.notificationBarIconColor,
             barBackground: root.getPublishedTheme().view.notificationBarBackground});
        }
      });
    });
  };

  // setSkinForWallet() - sets the skin for the specified wallet.
  // 
  root.setSkinForWallet = function(skinId, walletId, history, callback) {
    var reapplyingSkin = (skinId == root.getPublishedSkinId());

    $log.debug('' + (reapplyingSkin ?  'Reapplying skin... [walletId: ' + walletId + ']' : 'Switching skin... [walletId: ' + walletId + ']'));

    $log.debug('' + (root.getPublishedSkinById(skinId) != undefined && skinId != root.getPublishedSkinId() ? 
      'Old skin: ' + root.getPublishedSkinById(root.getPublishedSkinId()).header.name + '\n' +
      'New skin: ' + root.getPublishedSkinById(skinId).header.name :
      'Current skin: ' + (root.getPublishedSkinById(skinId) != undefined ? root.getPublishedSkinById(skinId).header.name : 'not set, setting to skinId ' + skinId)));

    // Retain a history of applied skins.
    if (history && !reapplyingSkin) {
      root._pushSkin(root.getPublishedSkinId());
    }

    root.walletId = walletId;

    // Check for bootstrapped skin and replace with the assigned walletId (the bootstrapped skin is assigned
    // before the wallet is created).
    var config = configService.getSync();
    if (config.theme.skinFor && config.theme.skinFor['NONE']) {

      var opts = {
        theme: {
          name: {},
          skinFor: {}
        }
      };

      opts.theme.name = config.theme.name;
      opts.theme.skinFor[root.walletId] = config.theme.skinFor['NONE'];

      configService.replace(opts, function(err) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }

        if (callback) {
          callback();
        }

        $rootScope.$emit('Local/SkinUpdated');
      });

    } else {

      // Perform typical skin change.
      var opts = {
        theme: {
          skinFor: {}
        }
      };

      opts.theme.skinFor[root.walletId] = root.getPublishedSkinById(skinId).header.name;

      configService.set(opts, function(err) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }

        root._publishCatalog();

        if (callback) {
          callback();
        }

        $rootScope.$emit('Local/SkinUpdated');
      });
    }
  };

  // setSkinByNameForWallet() - convenience function.
  // 
  root.setSkinByNameForWallet = function(skinName, walletId, history, callback) {
    root.setSkinForWallet(root.getPublishedSkinIdByName(skinName), walletId, history, callback);
  };

  // popSkin() - set the previous skin for the current wallet.
  //
  root.popSkin = function(callback) {
    var skinId = root._popSkin();
    if (skinId) {
      root.setSkinForWallet(skinId, root.walletId, false, callback);
    } else {
      $log.debug('Attempted to pop skin with empty skin history');
    }
  };

  // hasSkinHistory() - return true if there is skin history, false otherwise.
  // 
  root.hasSkinHistory = function() {
    return root.skinHistory.length > 0;
  };

  // getVanitySkins() - return only the collection of vanity skins.
  // 
  root.getVanitySkins = function() {
    return lodash.filter(root.getPublishedSkins(), function(skin) {
      return (new Skin(skin)).isVanity();
    });
  };

  // getAppletSkins() - return only the collection of applet skins.
  // 
  root.getAppletSkins = function() {
    return lodash.filter(root.getPublishedSkins(), function(skin) {
      return (new Skin(skin)).isApplet();
    });
  };

  // setAppletByNameForWallet() - sets the skin for the specified wallet.
  // 
  root.setAppletByNameForWallet = function(skinName, walletId, callback) {
    // When an applet is set the underlying wallet view is applied to the applet skin.
    // This allows the wallet skin to remain unchanged while the applet is presented.
    // The applet skin (vanity) 'view' is ignored (it is overwritten by design).
    // This strategy allows the applet to borrow the wallet skin settings for application to the applet presentation
    // allowing for a uniquely uniform presentation of the applet.
    var currentView = $rootScope.skin.view;
    root.setSkinByNameForWallet(skinName, walletId, true, function() {
      $rootScope.skin.view = currentView;
      callback();
    });
  };

  // deleteTheme() - removes the specified theme and all associated skins from the catalog.
  // 
  root.deleteTheme = function(themeId, callback) {
    var theme = root.getPublishedTheme();
    var catalog = themeCatalogService.getSync();
    var catalogThemes = catalog.themes || {};

    // Find the theme which will be deleted.
    var t_index = catalogThemes.length || 0;
    var i;
    for (i = 0; i < catalogThemes.length; i++) {
      if (catalogThemes[i].header.name == theme.header.name) {
        t_index = i;
        break;
      }
    }

    var cat = {
      themes: []
    };
    
    // Make a copy of the themes and remove the specified theme.
    cat.themes = lodash.cloneDeep(catalogThemes);
    var deletedTheme = lodash.pullAt(cat.themes, themeId);

    themeCatalogService.replace(cat, function(err) {   //TODO: cannot save themes if not using filestorage (content available in $rootScope only)
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      root._publishCatalog();

      if (callback) {
        callback();
      }

      notification.success(
        gettextCatalog.getString('Success'),
        gettextCatalog.getString('Deleted theme \'' + deletedTheme[0].header.name + '\''),
        {color: root.getPublishedSkin().view.primaryColor,
         iconColor: root.getPublishedTheme().view.notificationBarIconColor,
         barBackground: root.getPublishedTheme().view.notificationBarBackground});

      $log.debug('Deleted skin \'' + deletedTheme[0].header.name + '\'');
    });
  };

  // deleteSkin() - removes the specified skin from the catalog.
  // 
  root.deleteSkin = function(skinId, callback) {
    var theme = root.getPublishedTheme();
    var catalog = themeCatalogService.getSync();
    var catalogThemes = catalog.themes || {};

    // Find the theme for which the skin will be deleted.
    var t_index = catalogThemes.length || 0;
    var i;
    for (i = 0; i < catalogThemes.length; i++) {
      if (catalogThemes[i].header.name == theme.header.name) {
        t_index = i;
        break;
      }
    }

    var cat = {
      themes: []
    };
    
    // Make a copy of the themes and remove the skin from the specified theme.
    cat.themes = lodash.cloneDeep(catalogThemes);
    var deletedSkin = cat.themes[t_index].skins.splice(skinId, 1);

    themeCatalogService.replace(cat, function(err) {   //TODO: cannot save themes if not using filestorage (content available in $rootScope only)
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      root._publishCatalog();

      if (callback) {
        callback();
      }

      notification.success(
        gettextCatalog.getString('Success'),
        gettextCatalog.getString('Deleted skin \'' + deletedSkin[0].header.name + '\''),
        {color: root.getPublishedSkin().view.primaryColor,
         iconColor: root.getPublishedTheme().view.notificationBarIconColor,
         barBackground: root.getPublishedTheme().view.notificationBarBackground});

      $log.debug('Deleted skin \'' + deletedSkin[0].header.name + '\'');
    });
  };

  // likeTheme() - likes the specified theme.
  // 
  root.likeTheme = function(themeId) {
    var theme = root.getCatalogThemeById(themeId);
    theme.toggleLike();

    var catalogThemes = root.getCatalogThemes();
    catalogThemes[root.getPublishedThemeId()] = theme;

    var cat = {
      themes: []
    };
    
    cat.themes = lodash.cloneDeep(catalogThemes);

    themeCatalogService.set(cat, function(err) {   //TODO: cannot save themes if not using filestorage (content available in $rootScope only)
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      root._publishCatalog();

      // Notify other people that you like this.
      if (theme.header.social.iLikeThis) {
        var data = {
          theme: theme.header.name,
        };

        $http(_post('/social/like/theme', data)).then(function(data) {
          $log.info('Like theme: SUCCESS');
        }, function(data) {
          $log.error('Like theme: ERROR ' + data.statusText);
        });
      }

      notification.success(
        gettextCatalog.getString('Yay!'),
        gettextCatalog.getString('You like theme \'' + theme.header.name + '\''),
        {color: root.getPublishedSkin().view.primaryColor,
         iconColor: root.getPublishedTheme().view.notificationBarIconColor,
         barBackground: root.getPublishedTheme().view.notificationBarBackground});

      $log.debug('You like theme \'' + theme.header.name + '\'');
    });
  };

  // likeSkin() - likes the specified skin.
  // 
  root.likeSkin = function(skinId) {
    var skin = root.getCatalogSkinById(skinId);
    skin.toggleLike();

    var catalogThemes = root.getCatalogThemes();
    catalogThemes[root.getPublishedThemeId()].skins[skinId] = skin;

    var cat = {
      themes: []
    };
    
    cat.themes = lodash.cloneDeep(catalogThemes);

    themeCatalogService.set(cat, function(err) {   //TODO: cannot save themes if not using filestorage (content available in $rootScope only)
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      root._publishCatalog();

      // Notify other people that you like this.
      if (skin.header.social.iLikeThis) {
        var data = {
          theme: root.getPublishedTheme().header.name,
          skin: skin.name
        };

        $http(_post('/social/like/skin', data)).then(function(data) {
          $log.info('Like skin: SUCCESS');
        }, function(data) {
          $log.error('Like skin: ERROR ' + data.statusText);
        });
      }

      notification.success(
        gettextCatalog.getString('Yay!'),
        gettextCatalog.getString('You like skin \'' + skin.header.name + '\''),
        {color: root.getPublishedSkin().view.primaryColor,
         iconColor: root.getPublishedTheme().view.notificationBarIconColor,
         barBackground: root.getPublishedTheme().view.notificationBarBackground});

      $log.debug('You like skin \'' + skin.header.name + '\'');
    });
  };


  ///////////////////////////////////////////////////////////////////////////////

  // Current objects.
  root.getCurrentTheme = function() {
    return new Theme(root._themeById(root._currentThemeId()));
  };

  root.getCurrentSkin = function() {
    return new Skin(root.getCurrentTheme().skins[root._currentSkinId()], root.getCurrentTheme());
  };

  // Catalog objects.
  root.getCatalog = function() {
    return themeCatalogService.getSync();
  };

  root.getCatalogThemes = function() {
    return root._themes();
  };

  root.getCatalogThemeById = function(themeId) {
    return new Theme(root._themeById(themeId));
  };

  root.getCatalogThemeId = function() {
    return root._currentThemeId();
  };

  root.getCatalogSkinId = function() {
    return root._currentSkinIdForWallet(root.walletId);
  };

  root.getCatalogSkinIdForWallet = function(walletId) {
    return root._currentSkinIdForWallet(walletId);
  };

  root.getCatalogSkinById = function(skinId) {
    return new Skin(root.getCurrentTheme().skins[skinId], root.getCurrentTheme());
  };

  // Published objects.
  root.getPublishedThemes = function() {
    return $rootScope.themes;
  }

  root.getPublishedThemeById = function(themeId) {
    return $rootScope.themes[themeId];
  };

  root.getPublishedThemeId = function() {
    return $rootScope.themeId;
  };

  root.getPublishedTheme = function() {
    return new Theme(root.getPublishedThemeById(root.getPublishedThemeId()));
  };

  root.getPublishedSkinsForTheme = function(themeId) {
    return root.getPublishedTheme(themeId).skins;
  };

  root.getPublishedSkins = function() {
    return root.getPublishedSkinsForTheme(root.getPublishedThemeId());
  };

  root.getPublishedSkinById = function(skinId) {
    return new Skin(root.getPublishedTheme().skins[skinId], root.getPublishedTheme());
  };

  root.getPublishedSkinId = function() {
    return $rootScope.skinId;
  };

  root.getPublishedThemeDefaultSkinId = function() {
    return root.getPublishedTheme().header.defaultSkinId;
  };

  root.getPublishedSkinIdByName = function(name) {
    return lodash.findIndex(root.getPublishedSkins(), function(skin) {
      return skin.header.name == name;
    });
  };

  root.getPublishedSkin = function() {
    var theme = root.getPublishedTheme();
    return new Skin(theme.skins[root.getPublishedSkinId()], root.getPublishedTheme());
  };

  root.getPublishedSkinForWalletId = function(walletId) {
    return $rootScope.theme.skins[root.getCatalogSkinIdForWallet(walletId)];
  };

  ///////////////////////////////////////////////////////////////////////////////

  // Theme discovery
  // 
  root.discoverThemes = function(callback) {

    // Get theme headers from the server.
    var schema = themeCatalogService.getRequiredSchema();
    $http(root._get('/themes/' + schema)).then(function successCallback(response) {
      var themeHeaders = response.data.data;
      var discoveredThemeHeaders = [];

      for (var i = 0; i < themeHeaders.length; i++) {
        discoveredThemeHeaders.push(themeHeaders[i]);
      }

      $rootScope.discoveredThemeHeaders = discoveredThemeHeaders;
      $log.debug('Theme service: discovered ' + discoveredThemeHeaders.length + ' themes');
      callback(discoveredThemeHeaders);
    }, function errorCallback(response) {
      callback([]);
      $log.debug('Error: failed to GET theme resources from ' + response.config.url);
    });
  };

  root.importTheme = function(discoveredThemeName, notify, callback) {

    if (!themeCatalogService.supportsWritingThemeContent())
      throw new Error('themeService#importTheme improperly called when platform does not support writing theme content');

    var catalog = themeCatalogService.getSync();

    // Get the full theme from the server.
    var schema = themeCatalogService.getRequiredSchema();
    $http(root._get('/themes/' + schema + '/' + discoveredThemeName)).then(function successCallback(response) {

      // Import the discovered theme.
      // Read the full theme from the theme server and add it to this applications configuration settings.
      var discoveredTheme = new Theme(response.data);

      // Allow imported themes to be deleted.
      discoveredTheme.setDelete(true);

      // Avoid adding duplicates. The theme name is the key. Re-import the theme if it was previously imported.
      var catalogThemes = catalog.themes || [];
      var index = catalogThemes.length || 0;
      var i;
      for (i = 0; i < catalogThemes.length; i++) {
        if (catalogThemes[i].header.name == discoveredTheme.header.name) {
          index = i;
          break;
        }
      }

      catalogThemes[index] = discoveredTheme;

      var cat = {
        themes: []
      };
      
      cat.themes = lodash.cloneDeep(catalogThemes);

      themeCatalogService.set(cat, function(err) {   //TODO: cannot save themes if not using filestorage (content available in $rootScope only)
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }

        root._publishCatalog();

        if (callback) {
          callback(catalog[index]);
        }

        if (notify) {
          notification.success(
            gettextCatalog.getString('Success'),
            gettextCatalog.getString('Imported theme \'' + catalog.themes[index].header.name + '\''),
            {color: root.getPublishedSkin().view.primaryColor,
             iconColor: root.getPublishedTheme().view.notificationBarIconColor,
             barBackground: root.getPublishedTheme().view.notificationBarBackground});
        }

        $log.debug('Imported theme \'' + catalog.themes[index].header.name + '\'');
      });
    }, function errorCallback(response) {
      callback({});
      $log.debug('Error: failed to GET theme resources from ' + response.config.url);
    });
  };

  ///////////////////////////////////////////////////////////////////////////////

  // Skin discovery
  // 
  root.discoverSkins = function(theme, callback) {

    // Get skin headers from the server.
    var schema = themeCatalogService.getRequiredSchema();
    $http(root._get('/themes/' + schema + '/' + theme.header.name + '/skins')).then(function successCallback(response) {
      var skinHeaders = response.data.data;
      var discoveredSkinHeaders = [];

      for (var i = 0; i < skinHeaders.length; i++) {
        discoveredSkinHeaders.push(skinHeaders[i]);
      }

      $rootScope.discoveredSkinHeaders = discoveredSkinHeaders;
      $log.debug('Theme service: discovered ' + discoveredSkinHeaders.length + ' skins');
      callback(discoveredSkinHeaders);
    }, function errorCallback(response) {
      callback([]);
      $log.debug('Error: failed to GET skin resources from ' + response.config.url);
    });
  };

  // Import skin into the specified theme.
  root.importSkin = function(themeName, discoveredSkinName, notify, callback) {

    var schema = themeCatalogService.getRequiredSchema();
    $http(root._get('/themes/' + schema + '/' + themeName + '/' + discoveredSkinName)).then(function successCallback(response) {

      var discoveredSkin = new Skin(response.data, root.getCurrentTheme());

      // Allow imported skins to be deleted.
      discoveredSkin.setDelete(true);

      var catalog = themeCatalogService.getSync();
      var catalogThemes = catalog.themes || {};

      // Find the theme to which the skin will be added.
      var t_index = catalogThemes.length || 0;
      var i;
      for (i = 0; i < catalogThemes.length; i++) {
        if (catalogThemes[i].header.name == themeName) {
          t_index = i;
          break;
        }
      }

      // Find the skin index to attach the new skin.
      // Don't add duplicates. Replace the existing skin.
      var s_index = root._getSkinIndex(catalogThemes[t_index], discoveredSkin.header.name);

      // Attach the skin to the theme.
      catalogThemes[t_index].skins[s_index] = discoveredSkin;

      var cat = {
        themes: []
      };
      
      cat.themes = lodash.cloneDeep(catalogThemes);

      themeCatalogService.set(cat, function(err) {   //TODO: cannot save themes if not using filestorage (content available in $rootScope only)
        if (err) {
          $rootScope.$emit('Local/DeviceError', err);
          return;
        }

        root._publishCatalog();

        if (callback) {
          callback(catalog.themes[t_index].skins[s_index]);
        }

        if (notify) {
          notification.success(
            gettextCatalog.getString('Success'),
            gettextCatalog.getString('Imported skin \'' + catalog.themes[t_index].skins[s_index].header.name + '\''),
            {color: root.getPublishedSkin().view.primaryColor,
             iconColor: root.getPublishedTheme().view.notificationBarIconColor,
             barBackground: root.getPublishedTheme().view.notificationBarBackground});
        }

        $log.debug('Imported skin \'' + catalog.themes[t_index].skins[s_index].header.name + '\'');
      });
    }, function errorCallback(response) {
      callback({});
      $log.debug('Error: failed to GET skin resources from ' + response.config.url);
    });
  };

  return root;
});
