'use strict';
angular.module('copayApp.model').factory('AppletSession', function ($log, appletDataService) {

  var STATE_VALID = 'valid';
  var STATE_INVALID = 'invalid';

  // Constructor (See https://medium.com/opinionated-angularjs/angular-model-objects-with-javascript-classes-2e6a067c73bc#.970bxmciz)
  // 
  function AppletSession(applet) {
    if (!applet) {
      throw new Error('Error: no applet provided to create session');
    }
    this.applet = applet;
    this.state = STATE_VALID;
    this.timestamp = new Date();
    this.id = new Date().getTime();
    this.userData = {};
    this.publishedKeys = [];
    this.restore();
    return this;
  };

  function checkStateIsValid(session) {
    if (session.state == STATE_INVALID) {
      throw new Error('Error: invalid session state, (applet ID = ' + this.applet.header.appletId + ')');
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
  AppletSession.prototype.isForApplet = function(applet) {
    checkStateIsValid(this);
    return this.applet.header.appletId == applet.header.appletId;
  };

  AppletSession.prototype.restore = function() {
    checkStateIsValid(this);
    // Restore applet data from storage.
    var self = this;
    appletDataService.getData(this.applet.header.appletId, function(err, data) {
      if (err) {
        throw new Error('Error reading applet storage: ' + err.message);
      }
      self.userData = data;
    });
  };

  AppletSession.prototype.get = function(key) {
    checkStateIsValid(this);
    if (!key) {
      throw new Error('Error getting session data, no key specified');
    }
    return this.userData[key] || null;
  };

  AppletSession.prototype.set = function(key, value, publish) {
    checkStateIsValid(this);
    if (!key) {
      throw new Error('Error setting session data, no key specified');
    }
    this.userData[key] = value || null;

    // Optionally publish the value to root scope.
    if (publish) {
      $rootScope.applet[key] = value;
      this.publishedKeys.push(key);
    }
  };

  AppletSession.prototype.flush = function(callback) {
    checkStateIsValid(this);
    // Write applet data to storage.
    appletDataService.setData(this.applet.header.appletId, this.userData, function(err, data) {
      var response = null;
      if (err) {
        response = 'Error writing session data: ' + err.message;
      }
      if (callback) {
        callback(response);
      }
    });
  };

  AppletSession.prototype.close = function(flush, callback, force) {
    checkStateIsValid(this);
    if (flush) {
      // Write applet data to storage.
      var self = this;
      appletDataService.setData(this.applet.header.appletId, this.userData, function(err, data) {
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
