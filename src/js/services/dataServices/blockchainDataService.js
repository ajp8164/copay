'use strict';

angular.module('copayApp.services').factory('blockchainDataService', function($log, gettextCatalog, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'blockchain',
      name: 'Blockchain',
      title: gettextCatalog.getString('Blockchain network data'),
      description: gettextCatalog.getString('Bitcoin network data provided by Blockchain.'),
      category: 'network',
      url: 'https://blockchain.info',
      icon: 'img/ds/icon-blockchain.png',
      logo: 'img/ds/blockchain.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public blockchain statistics')
      },
      api: {
        toUrl: function(params) {
          return 'https://api.blockchain.info/stats';
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
              elems: ['market_price_usd'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            marketCap: { // Doesn't provide, so calculate value here.
              elems: ['totalbc', 'market_price_usd'],
              toValue: function(rawValues) {
                var totalbc = parseInt(rawValues[0]);
                var market_price_usd = parseFloat(rawValues[1]);
                return (totalbc * 0.00000001) * market_price_usd;
              }
            },
            hashRate: {
              elems: ['hash_rate'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0].toFixed(0));
              }
            },
            totalFeesBTC: {
              elems: ['total_fees_btc'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]) * 1e-8;
              }
            },
            numberBTCMined: {
              elems: ['n_btc_mined'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            numberTx: {
              elems: ['n_tx'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            numberBlocksMined: {
              elems: ['n_blocks_mined'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            timeBetweenBlocks: {
              elems: ['minutes_between_blocks'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]).toFixed(2);
              }
            },
            totalBitcoin: {
              elems: ['totalbc'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]) * 0.00000001;
              }
            },
            numberBlockTotal: {
              elems: ['n_blocks_total'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            estimatedTransactionVolumeUSD: {
              elems: ['estimated_transaction_volume_usd'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            blocksSize: {
              elems: ['blocks_size'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            minersRevenueUSD: {
              elems: ['miners_revenue_usd'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            nextRetarget: {
              elems: ['nextretarget'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            difficulty: {
              elems: ['difficulty'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            estimatedBTCSent: {
              elems: ['estimated_btc_sent'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            minersRevenueBTC: {
              elems: ['miners_revenue_btc'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            totalBTCSent: {
              elems: ['total_btc_sent'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            tradeVolumeBTC: {
              elems: ['trade_volume_btc'],
              toValue: function(rawValues) {
                return parseInt(rawValues[0]);
              }
            },
            tradeVolumeUSD: {
              elems: ['trade_volume_usd'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            rewardPerBlock: { // Doesn't provide, so calculate value here.
              elems: [],
              toValue: function(rawValues) {
                return 12.5; // TODO, needs source or calculation
              }
            },
            timestamp: {
              elems: ['timestamp'],
              toValue: function(rawValues) {
                return new Date(parseInt(rawValues[0] + '000'));
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
      cb()
    });
  };

  return root;
  
});
