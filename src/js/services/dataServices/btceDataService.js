'use strict';

angular.module('copayApp.services').factory('btceDataService', function($log, gettextCatalog, dataService) {
  var root = {};

  var service = {
    info: {
      id: 'btce',
      name: 'BTC-e',
      title: gettextCatalog.getString('BTC-e market data'),
      description: gettextCatalog.getString('Bitcoin market data provided by BTC-e. BTC-e historical data provided by Bitcoin Charts (http://bitcoincharts.com).'),
      category: 'market',
      url: 'https://btc-e.com/',
      icon: 'img/ds/icon-btce.png',
      logo: 'img/ds/btce.png'
    },
    sources: [
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Element data - open
    /// 
    /// Daily open price not directly available. As an estimate, use series data
    /// to go back one day to get price to use as open.
    ///     
    {
      meta: {
        enabled: false,
        description: gettextCatalog.getString('Public BTC/USD OHLC data from Bitcoin Charts')
      },
      api: {
        toUrl: function(query) {
          var url = 'http://bitcoincharts.com/charts/chart.json?m=btceUSD&SubmitButton=Draw&r=1&i={granularity}&c=1&s={start}&e={end}&Prev=&Next=&t=S&b=&a1=&m1=10&a2=&m2=25&x=0&i1=&i2=&i3=&i4=&v=1&cv=0&ps=0&l=0&p=0&';
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
        {
          params: {
            start: function() {
              return moment().subtract(1, 'days').format('YYYY-MM-DD');
            },
            end: function() {
              return moment().format('YYYY-MM-DD');
            },
            granularity: function() {
              return 'Daily';
            }
          },
          results: {
            open: {
              elems: [],
              toValue: function(rawValues) {
                // rawValues: [{
                //   time, open, high, low, close, volume (btc), volume (currency), weighted price
                // }]
                var result = undefined;
                if (Array.isArray(rawValues) && rawValues.length > 0) {
                  result = rawValues[rawValues.length - 2][4]; //open
                }
                return result;
              }
            }
          }
        }
      ]
    },
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
          return 'https://btc-e.com/api/3/ticker/btc_usd';
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
              elems: ['btc_usd.last'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            high: {
              elems: ['btc_usd.high'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            low: {
              elems: ['btc_usd.low'],
              toValue: function(rawValues) {
                return parseFloat(rawValues[0]);
              }
            },
            changePercent: {
              elems: ['this.open', 'btc_usd.last'],
              toValue: function(rawValues) {
                var open = parseFloat(rawValues[0]);
                var last = parseFloat(rawValues[1]);
                return (last - open) / open;
              }
            },
            changeUSD: {
              elems: ['this.open', 'btc_usd.last'],
              toValue: function(rawValues) {
                var open = parseFloat(rawValues[0]);
                var last = parseFloat(rawValues[1]);
                return last - open;
              }
            },
            timestamp: {
              elems: ['btc_usd.updated'],
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
          var url = 'http://bitcoincharts.com/charts/chart.json?m=btceUSD&SubmitButton=Draw&r=1&i={granularity}&c=1&s={start}&e={end}&Prev=&Next=&t=S&b=&a1=&m1=10&a2=&m2=25&x=0&i1=&i2=&i3=&i4=&v=1&cv=0&ps=0&l=0&p=0&';
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
              return '2-hour';
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
              return '2-hour';
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
      data: [],
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
