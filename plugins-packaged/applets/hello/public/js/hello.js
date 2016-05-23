'use strict';

angular.module('helloApp', [
	'ionic',
	'ngLodash',
	'copayPluginClient',
  'helloApp.services',
  'helloApp.controllers'
]);

angular.module('helloApp.controllers', []);
angular.module('helloApp.services', []);

'use strict';

angular.module('helloApp.controllers').controller('helloController', function($scope, $rootScope, $log, $timeout, CContext, $ionicSlideBoxDelegate) {

  var self = this;

  var SESSION_KEY_PREFS = 'preferences';

  var _session;
  var _applet;
  var _prefs;

  // Listen for the client service to complete startup.
  $rootScope.$on('Client/Start', function(event, error) {
    if (error) {
      $log.debug("Client startup error: " + error.message + ' (' + error.statusCode + ')');
    } else {
      self.init();
    }
  });

  // The session id should be used to obtain the applet session from the runtime context object (CContext).
  this.init = function() {

    CContext.getSession().then(function(session) {

      _session = session;
      return _session.getApplet();

    }).catch(function(error) {

      $log.debug("Failed to get session: " + error.message + ' (' + error.statusCode + ')');
      throw error;

    }).then(function(applet) {

      _applet = applet;

      _applet.propertySet({
        'title': 'Just Goodbye'
      });

      self.readPreferences();
      self.initSlidebox();
      _applet.hideSplash(1000);

    }).catch(function(error) {
      $log.debug("Failed to Initialize: " + error.message + ' (' + error.statusCode + ')');
    });

  };

  // Read applet data from persistent storage via the session object. Here we read from a data key that stores
  // our applet preferences as saved the last time this applet was run.  If this is the first time this applet has
  // run then the returned preferences will be empty.
  this.readPreferences = function() {
    _session.get(SESSION_KEY_PREFS).then(function(value) {
      _prefs = value;
    }).catch(function(error) {
      $log.debug("Failed to read preferences: " + error.message + ' (' + error.statusCode + ')');
    });
  };

  // Update the session with applet data and write the session data to persistent storage.
  this.savePreferences = function() {
    _session.set(SESSION_KEY_PREFS, _prefs);
    _session.flush();
  };

  // Event 'Local/AppletLeave' is fired after the user clicks to close this applet but before this applet controller
  // is destroyed.  When this event is received we update our session data. Before the applet session is destroyed
  // the session will write it's data to persistent storage.  Here we update session data with our applet preferences
  // so they are available next time this applet runs.
  $rootScope.$on('Local/AppletLeave', function(event, applet, wallet) {
    self.savePreferences();
  });

  // Slidebox functions.
  this.initSlidebox = function () {
    self.slideIndex = 0;
  };

  this.next = function() {
    $ionicSlideBoxDelegate.next();
  };

  this.previous = function() {
    $ionicSlideBoxDelegate.previous();
  };

  this.slideChanged = function(index) {
    self.slideIndex = index;
  };

});
