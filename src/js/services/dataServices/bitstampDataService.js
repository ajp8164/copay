'use strict';

angular.module('copayApp.services').factory('bitstampDataService', function($log, dataService) {
  var root = {};

  var service = {
    info: {
      name: 'Bitstamp',
      url: 'https://www.bitstamp.net'
    },
    sources: [{
      api: {
        url: 'https://www.bitstamp.net/api/v2/ticker/btcusd/'
      },
      data: {
        'price': {
          params: ['last'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'open': {
          params: ['open'],
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
        'change-percent': {
          params: ['open', 'last'],
          toValue: function(rawValues) {
            var open = parseFloat(rawValues[0]);
            var last = parseFloat(rawValues[1]);
            return (last - open) / open;
          }
        },
        'change-usd': {
          params: ['open', 'last'],
          toValue: function(rawValues) {
            var open = parseFloat(rawValues[0]);
            var last = parseFloat(rawValues[1]);
            return last - open;
          }
        },
        'timestamp': {
          params: ['timestamp'],
          toValue: function(rawValues) {
            return new Date(parseInt(rawValues[0] + '000'));
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
