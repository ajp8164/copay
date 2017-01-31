'use strict';

angular.module('copayApp.services').factory('coindeskDataService', function($log, gettextCatalog, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'coindesk',
      name: 'Coindesk',
      title: gettextCatalog.getString('Coindesk market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by Coindesk.'),
      category: 'market',
      url: 'https://www.coindesk.com',
      icon: 'img/ds/icon-coindesk.png',
      logo: 'img/ds/coindesk.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public current price data')
      },
      api: {
        toUrl: function(params) {
          return 'https://api.coindesk.com/v1/bpi/currentprice.json';
        },
        errorCheck: {
          path: 'error[0]',
          test: undefined,
          msgs: ['error[0]']
        }
      },
      queries: [
        {
          params: {},
          results: {
            'price': {
              elems: ['bpi.USD.rate_float'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            'timestamp': {
              elems: ['time.updated'],
              toValue: function(rawValues) {
                return new Date(rawValues[0]);
              }
            }
          }
        }
      ]
    }]
  };

  root.enable = function() {
    dataService.setEnabled(service, true);
  };

  root.disable = function() {
    dataService.setEnabled(service, false);
  };

  root.getInfo = function() {
    return service.info;
  };

  root.get = function(name) {
    return dataService.get(service, name);
  };

  root.fetch = function(cb) {
    dataService.fetch(service, function() {
      cb();
    });
  };

  return root;
  
});
