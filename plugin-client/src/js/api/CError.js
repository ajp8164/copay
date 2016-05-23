'use strict';

angular.module('copayPluginClient').factory('CError', function (lodash) {

  /**
   * Constructor.
   * @return {CError} An instance of CError.
   * @constructor
   */
  function CError(message) {
    lodash.assign(this, message);

    this.statusCode = this.response.statusCode;
    this.message = this.response.statusText;

    return this;
  };

  return CError;
});
