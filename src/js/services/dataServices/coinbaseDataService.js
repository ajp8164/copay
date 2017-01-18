'use strict';

angular.module('copayApp.services').factory('coinbaseDataService', function($log, dataService) {
  var root = {};

  var service = {
    info: {
      name: 'Coinbase',
      url: 'https://www.coinbase.com'
    },
    sources: [{
      api: {
        url: 'https://api.gdax.com/products/BTC-USD/stats'
      },
      data: {
        'price': {
          params: ['last'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'open': {
          params: ['open'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'high': {
          params: ['high'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'low': {
          params: ['low'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'change-percent': {
          params: ['open', 'last'],
          toValue: function(rawValues) {
            var open = parseFloat(rawValues[0]);
            var last = parseFloat(rawValues[1]);
            return (last - open) / open;
          }
        },
        'change-usd': {
          params: ['open', 'last'],
          toValue: function(rawValues) {
            var open = parseFloat(rawValues[0]);
            var last = parseFloat(rawValues[1]);
            return last - open;
          }
        },
        'volume': {
          params: ['volume'],
          toValue: function(rawValues) {
            return parseFloat(rawValues[0]);
          }
        },
        'timestamp': { // Doesn't post a timestamp, so generate one here.
          params: ['timestamp'],
          toValue: function(rawValues) {
            return new Date();
          }
        }
      }
    },
    {
      api: {
        toUrl: function(query) {
          var url = 'https://api.gdax.com/products/BTC-USD/candles?start={start}&end={end}&granularity={granularity}';
          url = url.replace('{start}', query.start());
          url = url.replace('{end}', query.end());
          url = url.replace('{granularity}', query.granularity());
          return url;
        }
      },
      data: {
        'series-1d-price-usd': {
          query: {
            start: function() {
              return new Date((Math.round(new Date().getTime() / 1000) - (24 * 3600)) * 1000).toISOString();
            },
            end: function() {
              return new Date(Math.round(new Date().getTime())).toISOString();
            },
            granularity: function() {
              return 300;
            }
          },
          params: [],
          toValue: _seriesPrice_toValue
        },
        'series-7d-price-usd': {
          query: {
            start: function() {
              return new Date((Math.round(new Date().getTime() / 1000) - (7 * 24 * 3600)) * 1000).toISOString();
            },
            end: function() {
              return new Date(Math.round(new Date().getTime())).toISOString();
            },
            granularity: function() {
              return 1500;
            }
          },
          params: [],
          toValue: _seriesPrice_toValue
        },
        'series-30d-price-usd': {
          query: {
            start: function() {
              return new Date((Math.round(new Date().getTime() / 1000) - (30 * 24 * 3600)) * 1000).toISOString();
            },
            end: function() {
              return new Date(Math.round(new Date().getTime())).toISOString();
            },
            granularity: function() {
              return 7000;
            }
          },
          params: [],
          toValue: _seriesPrice_toValue
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
      cb();
    });
  };

  // Data source transforms.
  // 
  function _seriesPrice_toValue(rawValues) {
    // rawValues: [{
    //   time, low, high, open, close, volume
    // }]
    // Note: time is truncated by 3 digits
    var result = {
      data: [[]],
      labels: [],
      series: ['Series 1']
    };
    for (var i = 0; i < rawValues.length; i++) {
      result.data[0].push(rawValues[i][4]); //close
      result.labels.push(new Date(rawValues[i][0]*1000)); // time
    }
    return result;
  };

  return root;
  
});
