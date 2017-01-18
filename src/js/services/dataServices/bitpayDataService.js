'use strict';

angular.module('copayApp.services').factory('bitpayDataService', function($log, dataService) {
  var root = {};

  var service = {
    info: {
      name: 'BitPay, Inc.',
      url: 'https://bitpay.com'
    },
    sources: [{
      api: {
        url: 'https://bitpay.com/api/rates/usd'
      },
      data: {
        'price': {
          params: ['rate'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'timestamp': { // Doesn't post a timestamp, so generate one here.
          params: ['timestamp'],
          toValue: function(rawValues) {
            return new Date();
          }
        }
      }
    }]
  };

  root.getInfo = function() {
    return service.info;
  };

  root.get = function(name) {
    return dataService.get(service, name);
  };

  root.fetch = function(cb) {
    dataService.fetch(service, function() {
      $log.info('Data service: done fetching ' + service.info.name + ' data');
      cb();
    });
  };

  return root;
  
});
