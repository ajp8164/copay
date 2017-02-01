'use strict';

angular.module('copayApp.services').factory('bitstampDataService', function($log, gettextCatalog, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'bitstamp',
      name: 'Bitstamp',
      title: gettextCatalog.getString('Bitstamp market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by Bitstamp. Bitstamp historical data provided by Bitcoin Charts (http://bitcoincharts.com).'),
      category: 'market',
      url: 'https://www.bitstamp.net',
      icon: 'img/ds/icon-bitstamp.png',
      logo: 'img/ds/bitstamp.png'
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
          return 'https://www.bitstamp.net/api/v2/ticker/btcusd/';
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
            timestamp: {
              elems: ['timestamp'],
              toValue: function(rawValues) {
                return new Date(parseInt(rawValues[0] + '000'));
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
        description: gettextCatalog.getString('Public BTC/USD OHLC data from Bitcoin Charts')
      },
      api: {
        toUrl: function(query) {
          var url = 'http://bitcoincharts.com/charts/chart.json?m=bitstampUSD&SubmitButton=Draw&r=1&i={granularity}&c=1&s={start}&e={end}&Prev=&Next=&t=C&b=&a1=&m1=10&a2=&m2=25&x=0&i1=&i2=&i3=&i4=&v=0&cv=0&ps=0&l=0&p=0&';
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
            series1dCloseUSD: {
              elems: [],
              toValue: _seriesClose_toValue
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
            series7dCloseUSD: {
              elems: [],
              toValue: _seriesClose_toValue
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
    // rawValues: [{
    //   time, open, high, low, close, volume (btc), volume (currency), weighted price
    // }]
    // Note: time is truncated by 3 digits
    var result = {
      data: []
    };
    if (Array.isArray(rawValues) && rawValues.length > 0) {
      for (var i = 0; i < rawValues.length; i++) {
        result.data.push({
          date: new Date(rawValues[i][0]*1000),
          open: rawValues[i][1],
          high: rawValues[i][2],
          low: rawValues[i][3],
          close: rawValues[i][4],
          volume: rawValues[i][6]
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
