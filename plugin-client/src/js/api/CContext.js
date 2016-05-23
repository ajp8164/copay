'use strict';
angular.module('copayPluginClient').factory('CContext', function (pluginClientService) {

  /**
   * Constructor.
   * @return {CContext} An instance of CContext.
   * @constructor
   */
  function CContext() {
    return this;
  };

  function sessionId() {
    var sessionId = window.location.search.substring(window.location.search.indexOf('sessionId=') + 10);
    if (sessionId.indexOf('&') >= 0) {
      sessionId = sessionId.substring(0, sessionId.indexOf('&'));
    }
    return sessionId;
  };

  /**
   * Return the applet session.
   * @return {Promise<CSession>} A promise to the session.
   * @static
   */
  CContext.getSession = function() {
    var request = {
     method: 'GET',
     url: '/session/' + sessionId(),
     responseObj: 'CSession'
    }
    return pluginClientService.sendMessage(request);
  };

  return CContext;
});
