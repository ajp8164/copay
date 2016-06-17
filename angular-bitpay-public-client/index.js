var bwcModule = angular.module('bpcModule', []);
var Client = require('../node_modules/bitpay-public-client');

bwcModule.constant('MODULE_VERSION', '1.0.0');

bwcModule.provider("bpcService", function() {
  var provider = {};

  provider.$get = function() {
    var service = {};

    service.getErrors = function() {
      return Client.errors;
    };

    service.Client = Client;

    service.getUtils = function() {
      return Client.Utils;
    };

    service.getClient = function(opts) {
      opts = opts || {};

      //note opts use `bpcurl` all lowercase;
      var bwc = new Client({
        baseUrl: opts.bpcurl || 'https://bitpay.com',
        verbose: opts.verbose
      });
      return bpc;
    };
    return service;
  };

  return provider;
});
