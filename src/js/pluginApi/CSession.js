'use strict';
angular.module('copayApp.api').factory('CSession', function () {

  /**
   * Constructor.  An instance of this class must be obtained from CContext.
   * @param {AppletSession} session - An internal Session object.
   * @return {Object} An instance of CSession.
   * @constructor
   */
  function CSession(appletSession) {
    this.session = appletSession;
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
    return this.session.flush(callback);
  };

  /**
   * Retrieve session data by key.
   * @param {String} key - User specified data key defined using set(key, value).
   * @return {Object} The object stored at the specified key.
   */
  CSession.prototype.get = function(key) {
    return this.session.get(key);
  };

  /**
   * Restore all session data from persistent storage.
   */
  CSession.prototype.restore = function() {
    return this.session.restore();
  };

  /**
   * Set session data by key.
   * @param {String} key - Location to store the specified value.
   * @param {Object} value - The data value to store.
   * @param {Boolean} [publish] - Publish the specified session data to the view scope as 'applet.session.<key>'.
   */
  CSession.prototype.set = function(key, value, publish) {
    return this.session.set(key, value, publish);
  };

  return CSession;
});
