'use strict';

angular.module('copayApp.services').factory('bitfinexDataService', function($log, dataService) {
  var root = {};

  var service = {
    info: {
      name: 'Bitfinex',
      url: 'https://www.bitfinex.com'
    },
    sources: [{
      api: {
        url: 'https://api.bitfinex.com/v1/pubticker/btcusd'
      },
      data: {
        'price': {
          params: ['last_price'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'high': {
          params: ['high'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'low': {
          params: ['low'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'timestamp': {
          params: ['timestamp'],
          toValue: function(rawValues) {
            return new Date(rawValues[0]);
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
