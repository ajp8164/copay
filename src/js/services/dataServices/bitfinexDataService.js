'use strict';

angular.module('copayApp.services').factory('bitfinexDataService', function($log, gettextCatalog, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'bitfinex',
      name: 'Bitfinex',
      title: gettextCatalog.getString('Bitfinex market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by Bitfinex.'),
      category: 'market',
      url: 'https://www.bitfinex.com',
      icon: 'img/ds/icon-bitfinex.png',
      logo: 'img/ds/bitfinex.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public BTC/USD ticker')
      },
      api: {
        toUrl: function(params) {
          return 'https://api.bitfinex.com/v2/ticker/tBTCUSD';
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
              elems: ['[6]'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            high: {
              elems: ['[8]'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            low: {
              elems: ['[9]'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            changePercent: {
              elems: ['[5]'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            changeUSD: {
              elems: ['[6]', '[4]'],
              toValue: function(rawValues) {
                var price = parseFloat(rawValues[0]);
                var changeBTC = parseFloat(rawValues[1]);
                return (price * changeBTC);
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
          var url = 'https://api.bitfinex.com/v2/candles/trade:{interval}:tBTCUSD/hist?limit={limit}&start={start}&end={end}';
          url = url.replace('{start}', query.start());
          url = url.replace('{end}', query.end());
          url = url.replace('{interval}', query.interval());
          url = url.replace('{limit}', query.limit());
          return url;
        },
        errorCheck: {
          path: '[0]',
          test: 'error',
          msgs: ['[2]']
        }
      },
      queries: [
        {
          params: {
            start: function() {
              return moment().subtract(1, 'days').unix() * 1000;
            },
            end: function() {
              return moment().unix() * 1000;
            },
            interval: function() {
              return '15m';
            },
            limit: function() {
              return 200;
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
              return moment().subtract(7, 'days').unix() * 1000;
            },
            end: function() {
              return moment().unix() * 1000;
            },
            interval: function() {
              return '1h';
            },
            limit: function() {
              return 200;
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
              return moment().subtract(30, 'days').unix() * 1000;
            },
            end: function() {
              return moment().unix() * 1000;
            },
            interval: function() {
              return '6h';
            },
            limit: function() {
              return 200;
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
        /// OHLC
        ///     
        {
          params: {
            start: function() {
              return moment().subtract(1, 'days').format('YYYY-MM-DD');
            },
            end: function() {
              return moment().format('YYYY-MM-DD');
            },
            granularity: function() {
              return '15-min';
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
              return moment().subtract(7, 'days').format('YYYY-MM-DD');
            },
            end: function() {
              return moment().format('YYYY-MM-DD');
            },
            granularity: function() {
              return 'Hourly';
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
              return moment().subtract(30, 'days').format('YYYY-MM-DD');
            },
            end: function() {
              return moment().format('YYYY-MM-DD');
            },
            granularity: function() {
              return '6-hour';
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
    // rawValues: [
    //  [time, open, close, high, low, volume]
    // ]
    // Note: time is truncated by 3 digits
    var result = {
      data: []
    };
    if (Array.isArray(rawValues) && rawValues.length > 0) {
      for (var i = 0; i < rawValues.length; i++) {
        result.data.push({
          date: new Date(rawValues[i][0]*1000),
          open: rawValues[i][1],
          high: rawValues[i][3],
          low: rawValues[i][4],
          close: rawValues[i][2],
          volume: rawValues[i][5]
        });
      }
    }
    return result;
  };

  function _seriesOHLC_toValue(rawValues) {
    return _seriesClose_toValue(rawValues);
  };

  return root;
  
});
