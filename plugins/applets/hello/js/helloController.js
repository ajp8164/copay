'use strict';

angular.module('copayApp.plugins').controller('helloController', function($rootScope, $log, CContext, $ionicSlideBoxDelegate) {

  var self = this;

  var SESSION_KEY_PREFS = 'preferences';

  var _session;
  var _applet;
  var _prefs;

  // Initialize the applet. This function is called when the session id when the controller is loaded.
  // The session id should be used to obtain the applet session from the runtime context object (CContext).
  this.init = function(sessionId) {
    _session = CContext.getSession(sessionId);
    _applet = _session.getApplet();
    _applet.property('title', 'Hello :-)');

    this.readPreferences();
    this.initSlidebox();
  };

  // Read applet data from persistent storage via the session object. Here we read from a data key that stores
  // our applet preferences as saved the last time this applet was run.  If this is the first time this applet has
  // run then the returned preferences will be empty.
  this.readPreferences = function() {
    _prefs = _session.get(SESSION_KEY_PREFS) || {};
  };

  // Event 'Local/AppletLeave' is fired after the user clicks to close this applet but before this applet controller
  // is destroyed.  When this event is received we update our session data. Before the applet session is destroyed
  // the session will write it's data to persistent storage.  Here we update session data with our applet preferences
  // so they are available next time this applet runs.
  $rootScope.$on('Local/AppletLeave', function(event, applet, wallet) {
    _session.set(SESSION_KEY_PREFS, _prefs);
  });

  // Slidebox functions.
  this.initSlidebox = function () {
    this.slideIndex = 0;
  };

  this.next = function() {
    $ionicSlideBoxDelegate.next();
  };

  this.previous = function() {
    $ionicSlideBoxDelegate.previous();
  };

  this.slideChanged = function(index) {
    this.slideIndex = index;
  };

});
