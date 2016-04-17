'use strict';

angular.module('copayApp.plugins').factory('CBitrefillService', function ($log, $base64, $http, CPlugin) {

  var self;

  /**
   * Service identification
   * { 
   *   "pluginId": "com.bitpay.copay.plugin.service.bitrefill",
   *   "api": {
   *     "url": "https://api.bitrefill.com/v1",
   *     "auth": {
   *       "apiKey": "71O95FNWO433KELENKA1VL4FS",
   *       "secretKey": "Tombd6r5Ye2AAsLN6BmbQf6ttTIkobSsN4zpdifx6Vg"
   *     }
   *   }
   * }
   */
  var pluginId = 'com.bitpay.copay.plugin.service.bitrefill';
  var serviceDescProperties = [
    '.pluginId',
    '.api',
    '.api.url',
    '.api.auth',
    '.api.auth.apiKey',
    '.api.auth.secretKey'
  ];
 
  /**
   * Constructor.
   * @param {Object} serviceDesc - A service description object originating from a skin.
   * @constructor
   */
  function CBitrefillService(serviceDesc) {
    self = this;
    CPlugin.validateServiceDesc(serviceDesc, serviceDescProperties, pluginId);

    for (var property in serviceDesc) {
      if (serviceDesc.hasOwnProperty(property)) {
        self[property] = serviceDesc[property];
      }
    }
    var my = CPlugin.getRegistryEntry(pluginId);
    self.providerName = my.name;
    self.providerDescription = my.description;
  };

  CBitrefillService.prototype.handleDataResponse = function(response, callback) {
    var data = response.data;
    if (data.error) {
      callback(data.error);
    } else if (data.errorMessage) {
      callback(data.errorMessage);
    } else {
      callback(null, data);
    }
  };
  
  CBitrefillService.prototype.handleErrorResponse = function(response, callback) {
    $log.error(response.status + ': ' + JSON.stringify(response.data));
    callback(response.status == 500 ? 'Server error' : response.data);
  };
  
  CBitrefillService.prototype.request = function(config, callback) {
    config.headers = {
      Authorization: 'Basic ' + $base64.encode(this.api.auth.apiKey + ':' + this.api.auth.apiSecret)
    };
    config.url = this.api.url + config.url;
    $log.debug('bitrefill request: ' + JSON.stringify(config));
    $http(config).then(function successCallback(response) {
      self.handleDataResponse(response, callback);
    }, function errorCallback(response) {
      self.handleErrorResponse(response, callback);
    });

  }

  CBitrefillService.prototype.inventory = function(callback) {
    var params = {
      method: 'GET',
      url: this.authurl + "/inventory/"
    };
    
    this.request(params, callback);
  };

  CBitrefillService.prototype.lookupNumber = function(number, operator, callback) {
    if (typeof operator == 'function') {
      operator = null;
      callback = operator;
    }
    var params = {
      method: 'GET',
      url: "/lookup_number",
      params: {
        number: number,
        operatorSlug: operator || undefined
      }
    };
    
    this.request(params, callback);
  };

  CBitrefillService.prototype.placeOrder = function(number, operator, pack, email, refundAddress, callback) {
    var params = {
      method: "POST",
      url: "/order",
      data: {
        number: number,
        valuePackage: pack,
        operatorSlug: operator,
        email: email,
        refund_btc_address: refundAddress
      }
    };
    
    this.request(params, callback);
  };

  CBitrefillService.prototype.orderStatus = function(order_id, callback) {
    var params = {
      method: "GET",
      url: "/order/" + order_id
    };
    
    this.request(params, callback);
  };

  return CBitrefillService;
});