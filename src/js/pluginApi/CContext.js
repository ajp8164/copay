'use strict';
angular.module('copayApp.api').factory('CContext', function (appletSessionService, CSession) {

  /**
   * Constructor.
   * @return {CContext} An instance of CContext.
   * @constructor
   */
  function CContext() {
    return this;
  };

  /**
   * Return the applet session.
   * @return {CSession} An applet session object.
   * @static
   */
  CContext.getSession = function(sessionId) {
    return new CSession(appletSessionService.getSession(sessionId));
  };

  return CContext;
});
