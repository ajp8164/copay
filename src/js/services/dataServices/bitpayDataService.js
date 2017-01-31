'use strict';

angular.module('copayApp.services').factory('bitpayDataService', function($log, gettextCatalog, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'bitpay',
      name: 'BitPay',
      title: gettextCatalog.getString('BitPay market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by BitPay.'),
      category: 'market',
      url: 'https://bitpay.com',
      icon: 'img/ds/icon-bitpay.png',
      logo: 'img/ds/bitpay.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public BTC/USD rates')
      },
      api: {
        toUrl: function(params) {
          return 'https://bitpay.com/api/rates/usd';
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
            price: {
              elems: ['rate'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            timestamp: { // Doesn't provide, so calculate value here.
              elems: [],
              toValue: function(rawValues) {
                return new Date();
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
