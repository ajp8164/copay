'use strict';

angular.module('copayApp.services').factory('bitcoinDataService', function($injector, lodash, bitfinexDataService, bitpayDataService, bitstampDataService, blockchainDataService, coinbaseDataService, coindeskDataService) {
  var root = {};

  var _isAvailable = false;
  var _queued = [];
  var _updateFrequencySeconds = 1 * 60;
  var _dataServices = [
    'bitfinexDataService',
    'bitpayDataService',
    'bitstampDataService',
    'blockchainDataService',
    'coinbaseDataService',
    'coindeskDataService'
  ];

  root.naPlaceholder = 'N/A';

  root.getData = function() {
    return {
      //////////////////////////////////////////////////////////////////////////
      ///
      /// Market data
      /// 
      market: {
        sources: {
          bitfinex: bitfinexDataService.getInfo(),
          bitpay:   bitpayDataService.getInfo(),
          bitstamp: bitstampDataService.getInfo(),
          coinbase: coinbaseDataService.getInfo(),
          coindesk: coindeskDataService.getInfo()
        },
        'series-1d-price-usd': {
          label: 'Market Price',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('series-1d-price-usd'),
          bitpay:   bitpayDataService.get('series-1d-price-usd'),
          bitstamp: bitstampDataService.get('series-1d-price-usd'),
          coinbase: coinbaseDataService.get('series-1d-price-usd'),
          coindesk: coindeskDataService.get('series-1d-price-usd')
        },
        'series-7d-price-usd': {
          label: 'Market Price',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('series-7d-price-usd'),
          bitpay:   bitpayDataService.get('series-7d-price-usd'),
          bitstamp: bitstampDataService.get('series-7d-price-usd'),
          coinbase: coinbaseDataService.get('series-7d-price-usd'),
          coindesk: coindeskDataService.get('series-7d-price-usd')
        },
        'series-30d-price-usd': {
          label: 'Market Price',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('series-30d-price-usd'),
          bitpay:   bitpayDataService.get('series-30d-price-usd'),
          bitstamp: bitstampDataService.get('series-30d-price-usd'),
          coinbase: coinbaseDataService.get('series-30d-price-usd'),
          coindesk: coindeskDataService.get('series-30d-price-usd')
        },
        'price': {
          label: 'Market Price',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('price'),
          bitpay:   bitpayDataService.get('price'),
          bitstamp: bitstampDataService.get('price'),
          coinbase: coinbaseDataService.get('price'),
          coindesk: coindeskDataService.get('price')
        },
        'open': {
          label: 'Today\'s Open',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('open'),
          bitpay:   bitpayDataService.get('open'),
          bitstamp: bitstampDataService.get('open'),
          coinbase: coinbaseDataService.get('open'),
          coindesk: coindeskDataService.get('open')
        },
        'high': {
          label: 'Today\'s High',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('high'),
          bitpay:   bitpayDataService.get('high'),
          bitstamp: bitstampDataService.get('high'),
          coinbase: coinbaseDataService.get('high'),
          coindesk: coindeskDataService.get('high')
        },
        'low': {
          label: 'Today\'s Low',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('low'),
          bitpay:   bitpayDataService.get('low'),
          bitstamp: bitstampDataService.get('low'),
          coinbase: coinbaseDataService.get('low'),
          coindesk: coindeskDataService.get('low')
        },
        'change-percent': {
          label: 'Change',
          description: '',
          unit: '%',
          bitfinex: bitfinexDataService.get('change-percent'),
          bitpay:   bitpayDataService.get('change-percent'),
          bitstamp: bitstampDataService.get('change-percent'),
          coinbase: coinbaseDataService.get('change-percent'),
          coindesk: coindeskDataService.get('change-percent')
        },
        'change-usd': {
          label: 'Change',
          description: '',
          unit: 'USD',
          bitfinex: bitfinexDataService.get('change-usd'),
          bitpay:   bitpayDataService.get('change-usd'),
          bitstamp: bitstampDataService.get('change-usd'),
          coinbase: coinbaseDataService.get('change-usd'),
          coindesk: coindeskDataService.get('change-usd')
        },
        'timestamp': {
          label: 'Last Updated',
          description: '',
          unit: '',
          bitfinex: bitfinexDataService.get('timestamp'),
          bitpay:   bitpayDataService.get('timestamp'),
          bitstamp: bitstampDataService.get('timestamp'),
          coinbase: coinbaseDataService.get('timestamp'),
          coindesk: coindeskDataService.get('timestamp')
        }
      },
      //////////////////////////////////////////////////////////////////////////
      ///
      /// Network data
      /// 
      network: {
        sources: [
          blockchainDataService.getInfo()
        ],
        'price': {
          label: 'Market Price',
          description: '',
          unit: 'USD',
          blockchain: blockchainDataService.get('price')
        },
        'market-cap': {
          label: 'Market Cap',
          description: '',
          unit: 'USD',
          blockchain: blockchainDataService.get('market-cap')
        },
        'hash-rate': {
          label: 'Hash Rate',
          description: '',
          unit: 'GH/s',
          blockchain: blockchainDataService.get('hash-rate')
        },
        'total-fees-btc': {
          label: 'Total Transaction Fees',
          description: '',
          unit: 'BTC',
          blockchain: blockchainDataService.get('total-fees-btc')
        },
        'number-btc-mined': {
          label: 'Bitcoins Mined',
          description: '',
          unit: 'BTC',
          blockchain: blockchainDataService.get('number-btc-mined')
        },
        'number-tx': {
          label: 'No. of Transactions',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('number-tx')
        },
        'number-blocks-mined': {
          label: 'Blocks Mined',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('number-blocks-mined')
        },
        'minutes-between-blocks': {
          label: 'Time Between Blocks',
          description: '',
          unit: 'Minutes',
          blockchain: blockchainDataService.get('minutes-between-blocks')
        },
        'total-bitcoin': {
          label: 'Total Bitcoins',
          description: '',
          unit: 'BTC',
          blockchain: blockchainDataService.get('total-bitcoin')
        },
        'number-block-total': {
          label: 'Total Blocks',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('number-block-total')
        },
        'estimated-transaction-volume-usd': {
          label: 'Estimated Transaction Volume',
          description: '',
          unit: 'USD',
          blockchain: blockchainDataService.get('estimated-transaction-volume-usd')
        },
        'blocks-size': {
          label: 'Blocks Size ',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('blocks-size')
        },
        'miners-revenue-usd': {
          label: 'Total Miners Revenue',
          description: '',
          unit: 'USD',
          blockchain: blockchainDataService.get('miners-revenue-usd')
        },
        'next-retarget': {
          label: 'Next Retarget',
          description: '',
          unit: 'days',
          blockchain: blockchainDataService.get('next-retarget')
        },
        'difficulty': {
          label: 'Difficulty',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('difficulty')
        },
        'estimated-btc-sent': {
          label: 'Estimated Transaction Volume',
          description: '',
          unit: 'BTC',
          blockchain: blockchainDataService.get('estimated-btc-sent')
        },
        'miners-revenue-btc': {
          label: 'Total Miners Revenue',
          description: '',
          unit: 'BTC',
          blockchain: blockchainDataService.get('miners-revenue-btc')
        },
        'total-btc-sent': {
          label: 'Total Output Volume',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('total-btc-sent')
        },
        'trade-volume-btc': {
          label: 'Trade Volume',
          description: '',
          unit: 'BTC',
          blockchain: blockchainDataService.get('trade-volume-btc')
        },
        'trade-volume-usd': {
          label: 'Trade Volume',
          description: '',
          unit: 'USD',
          blockchain: blockchainDataService.get('trade-volume-usd')
        },
        'timestamp': {
          label: 'Last Updated',
          description: '',
          unit: '',
          blockchain: blockchainDataService.get('timestamp')
        }
      }
    };
  };

  root.isAvailable = function() {
    return this._isAvailable;
  };

  root.whenAvailable = function(callback) {
    if (this.isAvailable()) {
      setTimeout(callback, 1);
    } else {
      _queued.push(callback);
    }
  };

  var fetch = function() {
    var _retrieve = function() {
      Object.asyncEach(_dataServices, function(dataServiceName, callback) {
        var dataService = $injector.get(dataServiceName);
        dataService.fetch(function() {
          return callback();
        });
      }, function() {
        // done
        _isAvailable = true;
        lodash.each(_queued, function(callback) {
          setTimeout(callback, 1);
        });
        setTimeout(_retrieve, _updateFrequencySeconds * 1000);
      });
    };

    _retrieve();
  };

  Object.asyncEach = function(iterableList, callback, done) {
    var i = -1;
    var length = iterableList.length;

    function loop() {
      i++;
      if (i === length) {
        done(); 
        return;
      } else if (i < length) {
        callback(iterableList[i], loop);
      } else {
        return;
      }
    } 
    loop();
  };

  // Start fetching data.
  fetch();

  return root;
  
});
