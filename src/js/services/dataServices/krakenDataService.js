'use strict';

angular.module('copayApp.services').factory('krakenDataService', function($log, gettextCatalog, lodash, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'kraken',
      name: 'Kraken',
      title: gettextCatalog.getString('Kraken market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by Kraken.'),
      category: 'market',
      url: 'https://www.kraken.com/',
      icon: 'img/ds/icon-kraken.png',
      logo: 'img/ds/kraken.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public BTC/USD Ticker')
      },
      api: {
        toUrl: function(params) {
          return 'https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD';
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
              elems: ['result.XXBTZUSD.c'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            open: {
              elems: ['result.XXBTZUSD.o'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            high: {
              elems: ['result.XXBTZUSD.h'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            low: {
              elems: ['result.XXBTZUSD.l'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            changePercent: {
              elems: ['result.XXBTZUSD.o', 'result.XXBTZUSD.c'],
              toValue: function(rawValues) {
                var open = parseFloat(rawValues[0]);
                var last = parseFloat(rawValues[1]);
                return (last - open) / open;
              }
            },
            changeUSD: {
              elems: ['result.XXBTZUSD.o', 'result.XXBTZUSD.c'],
              toValue: function(rawValues) {
                var open = parseFloat(rawValues[0]);
                var last = parseFloat(rawValues[1]);
                return last - open;
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
    },
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Series data
    ///     
    {
      meta: {
        enabled: true,
        description: gettextCatalog.getString('Public BTC/USD OHLC data')
      },
      api: {
        toUrl: function(query) {
          var url = 'https://api.kraken.com/0/public/OHLC?pair=XXBTZUSD&interval={interval}&since={since}';
          url = url.replace('{interval}', query.interval());
          url = url.replace('{since}', query.since());
          return url;
        },
        errorCheck: {
          path: 'error[0]',
          test: undefined,
          msgs: ['error[0]']
        }
      },
      queries: [
        //////////////////////////////////////////////////////////////////////////
        ///
        /// Close
        ///     
        {
          params: {
            interval: function() {
              return 5; // minutes
            },
            since: function() {
              return moment().subtract(1, 'days').unix();
            }
          },
          results: {
            series1dCloseUSD: {
              elems: ['result.XXBTZUSD'],
              toValue: _seriesClose_toValue
            }
          }
        },
        {
          params: {
            interval: function() {
              return 30; // minutes
            },
            since: function() {
              return moment().subtract(7, 'days').unix();
            }
          },
          results: {
            series7dCloseUSD: {
              elems: ['result.XXBTZUSD'],
              toValue: _seriesClose_toValue
            }
          }
        },
        {
          params: {
            interval: function() {
              return 240; // minutes
            },
            since: function() {
              return moment().subtract(30, 'days').unix();
            }
          },
          results: {
            series30dCloseUSD: {
              elems: ['result.XXBTZUSD'],
              toValue: _seriesClose_toValue
            }
          }
        },
        //////////////////////////////////////////////////////////////////////////
        ///
        /// OHLC, candlestick, MACD
        ///     
        {
          params: {
            interval: function() {
              return 5; // minutes
            },
            since: function() {
              return moment().subtract(1, 'days').unix();
            }
          },
          results: {
            series1dOHLCUSD: {
              elems: ['result.XXBTZUSD'],
              toValue: _seriesOHLC_toValue
            }
          }
        },
        {
          params: {
            interval: function() {
              return 30; // minutes
            },
            since: function() {
              return moment().subtract(7, 'days').unix();
            }
          },
          results: {
            series7dOHLCUSD: {
              elems: ['result.XXBTZUSD'],
              toValue: _seriesOHLC_toValue
            }
          }
        },
        {
          params: {
            interval: function() {
              return 240; // minutes
            },
            since: function() {
              return moment().subtract(30, 'days').unix();
            }
          },
          results: {
            series30dOHLCUSD: {
              elems: ['result.XXBTZUSD'],
              toValue: _seriesOHLC_toValue
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

  // Data source transforms.
  // 
  function _seriesClose_toValue(rawValues) {
    // rawValues: [
    //  [time, open, high, low, close, vwap, volume, count]
    // ]
    // Note: time is truncated by 3 digits
    var result = {
      data: []
    };
    if (Array.isArray(rawValues) && Array.isArray(rawValues[0])) {
      rawValues = rawValues[0];
      for (var i = 0; i < rawValues.length; i++) {
        result.data.push({
          date: new Date(rawValues[i][0]*1000),
          open: +rawValues[i][1],
          high: +rawValues[i][2],
          low: +rawValues[i][3],
          close: +rawValues[i][4],
          volume: +rawValues[i][6]
        });
      }
    }
    result.data = lodash.sortBy(result.data, 'date');
    return result;
  };

  function _seriesOHLC_toValue(rawValues) {
    return _seriesClose_toValue(rawValues);
  };

  return root;
  
});
