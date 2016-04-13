'use strict';
angular.module('copayApp.api').factory('CContext', function (appletService, CApplet, CSession) {

  /**
   * Constructor.
   * @return {CContext} An instance of CContext.
   * @constructor
   */
  function CContext() {
    return this;
  };

  /**
   * Return the applet from the current skin.
   * @return {CApplet} An applet object.
   * @static
   */
  CContext.getApplet = function () {
    return new CApplet(appletService.getApplet());
  };

  /**
   * Return the applet session.
   * @return {CSession} An applet session object.
   * @static
   */
  CContext.getSession = function() {
    return new CSession(appletService.getSession(appletService.getApplet()));
  };

  return CContext;
});
