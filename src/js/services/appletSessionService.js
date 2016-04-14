'use strict';

angular.module('copayApp.services').factory('appletSessionService', function($log, lodash, AppletSession) {

	var root = {};
	root._appletSessionPool = [];

  function addSession(session) {
    root._appletSessionPool.push(session);
  };

  root.getSession = function(sessionId) {
    return lodash.find(root._appletSessionPool, function(session) {
      return (session.id == sessionId);
    });
  };

  root.createSession = function(applet, callback) {
    var existingSessionIndex = lodash.findIndex(root._appletSessionPool, function(session) {
      return (session.isForApplet(applet.header.appletId));
    });

    if (existingSessionIndex >= 0) {
    	// Session state error; found an existing session for the applet.
    	// Quietly remove the existing state.
    	var removedSession = lodash.pullAt(root._appletSessionPool, existingSessionIndex);
    	removedSession = removedSession[0];
    	$log.debug('Applet session state error - forcibly removed session: ' + removedSession.id + ' (applet ID: ' + removedSession.getApplet().header.appletId + ')');
    }

  	// Create a new session.
    var newSession = new AppletSession(applet);
    newSession.restore(function(data) {
      addSession(newSession);
      callback(newSession);
      $log.debug('Applet session created: ' + newSession.id + ' (applet ID: ' + newSession.getApplet().header.appletId + ')');
    });
  };

  root.destroySession = function(sessionId) {
    var existingSessionIndex = lodash.findIndex(root._appletSessionPool, function(session) {
      return (session.id == sessionId);
    });

    if (existingSessionIndex >= 0) {
    	var removedSession = lodash.pullAt(root._appletSessionPool, existingSessionIndex);
    	removedSession = removedSession[0];
    	removedSession.flush(function(err, data) {
    		if (err) {
		    	$log.debug('Error while writing applet session data during applet close: ' + err.message + ' (applet ID: ' + removedSession.getApplet().header.appletId + '), session was closed anyway, session data was lost');
    		}
	    	$log.debug('Applet session successfully removed: ' + removedSession.id + ' (applet ID: ' + removedSession.getApplet().header.appletId + ')');
    	});
    } else {
    	$log.debug('Warning: applet session not found for removal: ' + removedSession.id + ' (applet ID: ' + removedSession.getApplet().header.appletId + ')');
	  }
  };

  return root;
});
