'use strict';

angular.module('copayPluginClient').factory('CSession', function (lodash, pluginClientService, CApplet) {

  var _session;

  /**
   * Constructor.  An instance of this class must be obtained from CContext.
   * @param {AppletSession} session - An internal Session object.
   * @return {Object} An instance of CSession.
   * @constructor
   */
  function CSession(appletSession) {
    lodash.assign(this, appletSession);
    _session = appletSession;
    return this;
  };

  /**
   * Write all session data to persistent storage.
   * @return {Promise} A promise at completion.
   */
  CSession.prototype.flush = function() {
    var request = {
     method: 'POST',
     url: '/session/flush'
    }
    return pluginClientService.sendMessage(request);
  };

  /**
   * Retrieve session data by name.
   * @param {String} name - User specified data name defined using set(name, value).
   * @return {Promise<Object>} A promise for stored value.
   */
  CSession.prototype.get = function(name) {
    var request = {
     method: 'GET',
     url: '/session/' + this.id + '/var/' + name
    }
    return pluginClientService.sendMessage(request);
  };

  /**
   * Return the applet for this session.
   * @return {Promise<CApplet>} A promise for the applet.
   */
  CSession.prototype.getApplet = function () {
    var request = {
      method: 'GET',
      url: '/session/' + this.id + '/applet',
      responseObj: 'CApplet'
    }
    return pluginClientService.sendMessage(request);
  };

  /**
   * Restore all session data from persistent storage.
   * @return {Promise} A promise at completion.
   */
  CSession.prototype.restore = function() {
    var request = {
      method: 'POST',
      url: '/session/' + this.id + '/restore',
      data: {}
    }

    pluginClientService.sendMessage(request);
  };

  /**
   * Set session data by name.
   * @param {String} name - Location to store the specified value.
   * @param {Object} value - The data value to store.
   * @param {Boolean} [publish] - Publish the specified session data to the view scope as 'applet.session.<name>'.
   * @return {Promise} A promise at completion.
   */
  CSession.prototype.set = function(name, value, publish) {
    var request = {
      method: 'POST',
      url: '/session/' + this.id + '/var/' + name + (publish ? '/publish' : ''),
      data: {
        value: value
      }
    }

    pluginClientService.sendMessage(request).then(function(response) {
      if (publish) {
        pluginClientService.refreshScope();
      }
    });
  };

  return CSession;
});
