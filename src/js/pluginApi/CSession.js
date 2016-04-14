'use strict';
angular.module('copayApp.api').factory('CSession', function (lodash, CApplet) {

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
   * Callback for flush().
   * @callback {flushCallback}
   * @param {String} error - An error message or undefined.
   */

  /**
   * Write all session data to persistent storage.
   * @param {flushCallback} callback - A callback on completion.
   */
  CSession.prototype.flush = function(callback) {
    return _session.flush(callback);
  };

  /**
   * Retrieve session data by key.
   * @param {String} key - User specified data key defined using set(key, value).
   * @return {Object} The object stored at the specified key.
   */
  CSession.prototype.get = function(key) {
    return _session.get(key);
  };

  /**
   * Return the applet for this session.
   * @return {CApplet} An applet object.
   */
  CSession.prototype.getApplet = function () {
    return new CApplet(_session.getApplet());
  };

  /**
   * Restore all session data from persistent storage.
   */
  CSession.prototype.restore = function() {
    return _session.restore();
  };

  /**
   * Set session data by key.
   * @param {String} key - Location to store the specified value.
   * @param {Object} value - The data value to store.
   * @param {Boolean} [publish] - Publish the specified session data to the view scope as 'applet.session.<key>'.
   */
  CSession.prototype.set = function(key, value, publish) {
    return _session.set(key, value, publish);
  };

  return CSession;
});
