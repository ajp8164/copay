'use strict';

angular.module('copayApp.services').factory('gdaxDataService', function($log, gettextCatalog, lodash, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'gdax',
      name: 'GDAX',
      title: gettextCatalog.getString('GDAX market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by GDAX.'),
      category: 'market',
      url: 'https://www.gdax.com',
      icon: 'img/ds/icon-gdax.png',
      logo: 'img/ds/gdax.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public BTC/USD statistics')
      },
      api: {
        toUrl: function(params) {
          return 'https://api.gdax.com/products/BTC-USD/stats';
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
              elems: ['last'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            open: {
              elems: ['open'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            high: {
              elems: ['high'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            low: {
              elems: ['low'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            changePercent: {
              elems: ['open', 'last'],
              toValue: function(rawValues) {
                var open = parseFloat(rawValues[0]);
                var last = parseFloat(rawValues[1]);
                return (last - open) / open;
              }
            },
            changeUSD: {
              elems: ['open', 'last'],
              toValue: function(rawValues) {
                var open = parseFloat(rawValues[0]);
                var last = parseFloat(rawValues[1]);
                return last - open;
              }
            },
            volume: {
              elems: ['volume'],
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
    },
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Series data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public BTC/USD OHLC data')
      },
      api: {
        toUrl: function(query) {
          var url = 'https://api.gdax.com/products/BTC-USD/candles?start={start}&end={end}&granularity={granularity}';
          url = url.replace('{start}', query.start());
          url = url.replace('{end}', query.end());
          url = url.replace('{granularity}', query.granularity());
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
            start: function() {
              return moment().subtract(1, 'days').toISOString();
            },
            end: function() {
              return moment().toISOString();
            },
            granularity: function() {
              return 435;
            }
          },
          results: {
            series1dCloseUSD: {
              elems: [],
              toValue: _seriesClose_toValue
            }
          }
        },
        {
          params: {
            start: function() {
              return moment().subtract(7, 'days').toISOString();
            },
            end: function() {
              return moment().toISOString();
            },
            granularity: function() {
              return 3000;
            }
          },
          results: {
            series7dCloseUSD: {
              elems: [],
              toValue: _seriesClose_toValue
            }
          }
        },
        {
          params: {
            start: function() {
              return moment().subtract(30, 'days').toISOString();
            },
            end: function() {
              return moment().toISOString();
            },
            granularity: function() {
              return 12500;
            }
          },
          results: {
            series30dCloseUSD: {
              elems: [],
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
            start: function() {
              return moment().subtract(1, 'days').toISOString();
            },
            end: function() {
              return moment().toISOString();
            },
            granularity: function() {
              return 435;
            }
          },
          results: {
            series1dOHLCUSD: {
              elems: [],
              toValue: _seriesOHLC_toValue
            }
          }
        },
        {
          params: {
            start: function() {
              return moment().subtract(7, 'days').toISOString();
            },
            end: function() {
              return moment().toISOString();
            },
            granularity: function() {
              return 3000;
            }
          },
          results: {
            series7dOHLCUSD: {
              elems: [],
              toValue: _seriesOHLC_toValue
            }
          }
        },
        {
          params: {
            start: function() {
              return moment().subtract(30, 'days').toISOString();
            },
            end: function() {
              return moment().toISOString();
            },
            granularity: function() {
              return 12500;
            }
          },
          results: {
            series30dOHLCUSD: {
              elems: [],
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
    // rawValues: [{
    //   time, low, high, open, close, volume
    // }]
    // Note: time is truncated by 3 digits
    var result = {
      data: []
    };
    if (Array.isArray(rawValues) && rawValues.length > 0) {
      for (var i = 0; i < rawValues.length; i++) {
        result.data.push({
          date: new Date(rawValues[i][0]*1000),
          open: rawValues[i][3],
          high: rawValues[i][2],
          low: rawValues[i][1],
          close: rawValues[i][4],
          volume: rawValues[i][5]
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
