'use strict';
angular.module('copayApp.api').factory('CSystem', function () {

  /**
   * Constructor.
   * @return {CSystem} An instance of CSystem.
   * @constructor
   */
  function CSystem() {
    return this;
  };

  /**
   * Return whether or not the specified object has all required properties.
   * @return {Object} An object of two arrays; 'missing' and 'other' properties.
   * @static
   */
  CSystem.checkObject = function(obj, requiredProperties) {
    var properties = iterateObj(obj, '');

    var missing = [];
    var other = [];
    for (var i = 0; i < requiredProperties.length; i++) {
      if (properties.indexOf(requiredProperties[i]) < 0) {
        missing.push(requiredProperties[i]);
      }
    }
    for (var i = 0; i < properties.length; i++) {
      if (requiredProperties.indexOf(properties[i]) < 0) {
        other.push(properties[i]);
      }
    }
    return { missing: missing, other: other };
  };

  // Recursively iterate over the objects properties and return an array of properties.
  function iterateObj(obj, stack) {
    var properties = [];
    for (var property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] == "object") {
          properties.push(stack + '.' + property);
          properties = properties.concat(iterateObj(obj[property], stack + '.' + property));
        } else {
          properties.push(stack + '.' + property);
        }
      }
    }
    return properties;
  };

  return CSystem;
});
