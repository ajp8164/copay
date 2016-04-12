'use strict';

angular.module('copayApp.services').factory('appletDataService', function($log, lodash, storageService, appletCatalogService) {

  var root = {};

  function getAppletKey(appletId) {
    return 'applet-' + appletId;
  };

  function trackAppletData(appletKey) {
    var catalog = appletCatalogService.getSync();

    var index = lodash.findIndex(catalog.appletData, function(data) {
      return (data.key == appletKey);
    });

    if (index >= 0) {
      // Update the existing applet data entry.
      catalog.appletData[index].updated = new Date();
    } else {
      // Applet data entry not found; create a new applet data entry.
      var now = new Date();
      var newAppletData = {
        key: appletKey,
        updated: now,
        created: now
      };

      catalog.appletData.push(newAppletData);
    }

    appletCatalogService.set(catalog, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
    });
  };

  root.getData = function(appletId, cb) {
    var appletKey = getAppletKey(appletId);
    storageService.getValueByKey(appletKey, function(err, data) {
      data = data || {};
      $log.debug('Applet data read (' + appletKey + '):', data);
      return cb(err, data);
    });
  };

  root.setData = function(appletId, newData, cb) {
    var appletKey = getAppletKey(appletId);
    storageService.getValueByKey(appletKey, function(err, oldData) {
      oldData = oldData || {};
      if (lodash.isString(oldData)) {
        if (oldData.length == 0)
          oldData = '{}';
        oldData = JSON.parse(oldData);
      }
      if (lodash.isString(newData)) {
        newData = JSON.parse(newData);
      }
      var data = oldData;
      lodash.merge(data, newData);
      storageService.storeValueByKey(appletKey, JSON.stringify(data), cb);
      trackAppletData(appletKey);
    });
  };

  return root;
});
