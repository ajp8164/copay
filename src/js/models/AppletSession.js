'use strict';
angular.module('copayApp.model').factory('AppletSession', function ($rootScope, $log, appletDataService) {

  var self = this;

  var STATE_VALID = 'valid';
  var STATE_INVALID = 'invalid';

  var _applet = null;
  var _userData = {};
  var _publishedKeys = [];

  // Constructor (See https://medium.com/opinionated-angularjs/angular-model-objects-with-javascript-classes-2e6a067c73bc#.970bxmciz)
  // 
  function AppletSession(applet, callback) {
    if (!applet) {
      throw new Error('Error: no applet provided to create session');
    }
    _applet = applet;
    this.state = STATE_VALID;
    this.timestamp = new Date();
    this.id = '' + new Date().getTime();
    return this;
  };

  function checkStateIsValid(session) {
    if (session.state == STATE_INVALID) {
      throw new Error('Error: invalid session state, (applet ID = ' + _applet.header.appletId + ')');
    }
  }

  function doClose(session) {
    // Delete user data.
    session.userData = {};

    // Delete published values.
    for (var i = 0; i < session.publishedKeys.length; i++) {
      delete $rootScope.applet[key];
    }
    session.state = STATE_INVALID;
  };

  // Public methods
  //
  AppletSession.prototype.isForApplet = function(appletId) {
    checkStateIsValid(this);
    return _applet.header.appletId == appletId;
  };

  AppletSession.prototype.getApplet = function() {
    checkStateIsValid(this);
    return _applet;
  };

  AppletSession.prototype.restore = function(callback) {
    checkStateIsValid(this);
    // Restore applet data from storage.
    appletDataService.getData(_applet.header.appletId, function(err, data) {
      if (err) {
        throw new Error('Error reading applet storage: ' + err.message);
      }
      _userData = data;
      callback(data);
    });
  };

  AppletSession.prototype.get = function(key) {
    checkStateIsValid(this);
    if (!key) {
      throw new Error('Error getting session data, no key specified');
    }
    return _userData[key] || null;
  };

  AppletSession.prototype.set = function(key, value, publish) {
    checkStateIsValid(this);
    if (!key) {
      throw new Error('Error setting session data, no key specified');
    }
    _userData[key] = value || null;

    // Optionally publish the value to root scope.
    if (publish) {
      $rootScope.applet.session = $rootScope.applet.session || {};
      $rootScope.applet.session[key] = value;
      _publishedKeys.push(key);
    }
  };

  AppletSession.prototype.flush = function(callback) {
    checkStateIsValid(this);
    // Write applet data to storage.
    appletDataService.setData(_applet.header.appletId, _userData, function(err, data) {
      if (err) {
        err = 'Error writing session data: ' + err.message;
      }
      if (callback) {
        callback(err);
      }
    });
  };

  AppletSession.prototype.close = function(flush, callback, force) {
    checkStateIsValid(this);
    if (flush) {
      // Write applet data to storage.
      var self = this;
      appletDataService.setData(_applet.header.appletId, _userData, function(err, data) {
        var response = null;
        if (err) {
          response = 'Error writing session data: ' + err.message;
          if (force) {
            doClose(self);
          }
        }
        if (callback) {
          callback(response);
        }
      });

    } else {

      doClose(this);
      if (callback) {
        callback(response);
      }
    }
  };

  return AppletSession;
});
