'use strict';

angular.module('copayApp.services').factory('appletCatalogService', function(storageService, lodash, $log, brand) {

  var root = {};

  var defaultCatalog = {

    metadata: {},

    appletState: []

  };

  var catalogCache = null;

  root.supportsWriting = function() {
    return storageService.fileStorageAvailable();
  }

  root.getStorageRoot = function() {
    return storageService.getApplicationDirectory();
  };

  root.init = function(cb) {
    $log.debug('Initializing applet catalog');
    root.get(function(err, appletCatalog) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      $log.debug('Applet catalog initialized: ' + JSON.stringify(appletCatalog));
      cb();
    });
  };

  root.getSync = function() {
    if (!catalogCache)
      throw new Error('appletCatalogService#getSync called when cache is not initialized');
    return catalogCache;
  };

  root.get = function(cb) {
    storageService.getAppletCatalog(function(err, localCatalog) {
      if (localCatalog) {
        catalogCache = JSON.parse(localCatalog);
      } else {
        catalogCache = lodash.clone(defaultCatalog);
      };
      $log.debug('Applet catalog read:', catalogCache)
      return cb(err, catalogCache);
    });
  };

  root.set = function(newCat, cb) {
    var catalog = lodash.cloneDeep(defaultCatalog);
    storageService.getAppletCatalog(function(err, oldCat) {
      if (lodash.isString(oldCat)) {
        if (oldCat.length == 0)
          oldCat = '{}';
        oldCat = JSON.parse(oldCat);
      }
      if (lodash.isString(catalog)) {
        catalog = JSON.parse(catalog);
      }
      if (lodash.isString(newCat)) {
        newCat = JSON.parse(newCat);
      }
      lodash.merge(catalog, oldCat, newCat);
      catalogCache = catalog;

      storageService.storeAppletCatalog(JSON.stringify(catalog), cb);
    });
  };

  root.replace = function(newCat, cb) {
    var catalog = lodash.cloneDeep(defaultCatalog);
    storageService.getAppletCatalog(function(err, oldCat) {
      if (lodash.isString(oldCat)) {
        if (oldCat.length == 0)
          oldCat = '{}';
        oldCat = JSON.parse(oldCat);
      }
      if (lodash.isString(catalog)) {
        catalog = JSON.parse(catalog);
      }
      if (lodash.isString(newCat)) {
        newCat = JSON.parse(newCat);
      }
      lodash.assign(catalog, oldCat, newCat);
      catalogCache = catalog;

      storageService.storeAppletCatalog(JSON.stringify(catalog), cb);
    });
  };

  root.reset = function(cb) {
    catalogCache = lodash.clone(defaultCatalog);
    storageService.clearAppletCatalog(cb);
  };

  root.getDefaults = function() {
    return lodash.clone(defaultCatalog);
  };

  return root;
});
