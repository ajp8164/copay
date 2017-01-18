'use strict';

angular.module('copayApp.services').factory('blockchainDataService', function($log, dataService) {
  var root = {};

  var service = {
    info: {
      name: 'Blockchain',
      url: 'https://blockchain.info'
    },
    sources: [{
      api: {
        url: 'https://api.blockchain.info/stats'
      },
      data: {
        'price': {
          params: ['market_price_usd'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'market-cap': {
          params: ['totalbc', 'market_price_usd'],
          toValue: function(rawValues) {
            var totalbc = parseInt(rawValues[0]);
            var market_price_usd = parseFloat(rawValues[1]);
            return (totalbc * 0.00000001) * market_price_usd;
          }
        },
        'hash-rate': {
          params: ['hash_rate'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'total-fees-btc': {
          params: ['total_fees_btc'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]) * 1e-8;
          }
        },
        'number-btc-mined': {
          params: ['n_btc_mined'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'number-tx': {
          params: ['n_tx'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'number-blocks-mined': {
          params: ['n_blocks_mined'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'minutes-between-blocks': {
          params: ['minutes_between_blocks'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]).toFixed(2);
          }
        },
        'total-bitcoin': {
          params: ['totalbc'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]) * 0.00000001;
          }
        },
        'number-block-total': {
          params: ['n_blocks_total'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'estimated-transaction-volume-usd': {
          params: ['estimated_transaction_volume_usd'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'blocks-size': {
          params: ['blocks_size'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'miners-revenue-usd': {
          params: ['miners_revenue_usd'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'next-retarget': {
          params: ['nextretarget'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'difficulty': {
          params: ['difficulty'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'estimated-btc-sent': {
          params: ['estimated_btc_sent'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'miners-revenue-btc': {
          params: ['miners_revenue_btc'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'total-btc-sent': {
          params: ['total_btc_sent'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'trade-volume-btc': {
          params: ['trade_volume_btc'],
          toValue: function(rawValues) {
            return parseInt(rawValues[0]);
          }
        },
        'trade-volume-usd': {
          params: ['trade_volume_usd'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
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
      cb()
    });
  };

  return root;
  
});
