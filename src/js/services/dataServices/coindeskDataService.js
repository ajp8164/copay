'use strict';

angular.module('copayApp.services').factory('coindeskDataService', function($log, dataService) {
  var root = {};

  var service = {
    info: {
      name: 'Coindesk',
      url: 'https://www.coindesk.com'
    },
    sources: [{
      api: {
	      url: 'https://api.coindesk.com/v1/bpi/currentprice.json'
      },
      data: {
        'price': {
          params: ['bpi.USD.rate_float'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'timestamp': {
          params: ['time.updated'],
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
