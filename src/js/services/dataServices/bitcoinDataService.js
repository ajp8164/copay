'use strict';

angular.module('copayApp.services').factory('bitcoinDataService', function($rootScope, $log, $injector, $timeout, lodash, configService, gettextCatalog, dataService) {
  var root = {};

  var _isAvailable = false;
  var _retriever = undefined;
  var _queued = [];

  // Describes the source for data available through this service.
  var _dataServices = [
    'bitfinexDataService',
    'bitpayDataService',
    'bitstampDataService',
    'blockchainDataService',
    'btceDataService',
    'coindeskDataService',
    'gdaxDataService',
    'krakenDataService'
  ];

  // Describes the data available through this service.
  // 
  var _data = {
    info: {
      naPlaceholder: 'N/A',
      disclaimer: gettextCatalog.getString(
        'This data is provided "as is", without warranty of any kind, express or implied, ' +
        'including but not limited to the warranties of currency calculation, fitness for trading ' +
        'or other financial decision making. In no event shall the authors or distributors of ' +
        'this software program or of the information and data be liable for any claim, damages or ' +
        'other liability arising from, out of or in connection with the data and/or its representation.'
      )
    },
    // Views are used to present data in structures for easier access.
    views: {
      default: {}
    },
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Market data
    /// 
    market: {
      sources: {
        none: {
          id: 'none',
          name: gettextCatalog.getString('None'),
          title: '',
          description: '',
          url: '',
          category: 'market',
          icon: 'img/ds/icon-none.png',
          logo: ''
        }
      },
      groups: [
        {
          id: 'seriesClose',
          name: gettextCatalog.getString('Market Price'),
          options: {
            plot: 'close'
          },
          elements: {
            series1dCloseUSD: {
              label: gettextCatalog.getString('1 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%H:%M',
                timeInterval: '3-hour'
              }
            },
            series7dCloseUSD: {
              label: gettextCatalog.getString('7 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: 'daily'
              }
            },
            series30dCloseUSD: {
              label: gettextCatalog.getString('30 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: '6-day'
              }
            }
          }
        },
        {
          id: 'seriesOHLC',
          name: 'OHLC',
          options: {
            plot: 'ohlc'
          },
          elements: {
            series1dOHLCUSD: {
              label: gettextCatalog.getString('1 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%H:%M',
                timeInterval: '3-hour'
              }
            },
            series7dOHLCUSD: {
              label: gettextCatalog.getString('7 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: 'daily'
              }
            },
            series30dOHLCUSD: {
              label: gettextCatalog.getString('30 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: '2-day'
              }
            }
          }
        },
        {
          id: 'seriesCandlestick',
          name: 'Candlestick',
          options: {
            plot: 'candlestick'
          },
          // Uses OHLC data.
          elements: {
            series1dOHLCUSD: {
              alias: 'series1dCandlestickUSD',
              label: gettextCatalog.getString('1 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%H:%M',
                timeInterval: '3-hour'
              }
            },
            series7dOHLCUSD: {
              alias: 'series7dCandlestickUSD',
              label: gettextCatalog.getString('7 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: 'daily'
              }
            },
            series30dOHLCUSD: {
              alias: 'series30dCandlestickUSD',
              label: gettextCatalog.getString('30 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: '2-day'
              }
            }
          }
        },
        {
          id: 'seriesVolume',
          name: 'Volume',
          options: {
            plot: 'volume'
          },
          // Uses OHLC data.
          elements: {
            series1dOHLCUSD: {
              alias: 'series1dVolumeUSD',
              label: gettextCatalog.getString('1 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%H:%M',
                timeInterval: '3-hour'
              }
            },
            series7dOHLCUSD: {
              alias: 'series7dVolumeUSD',
              label: gettextCatalog.getString('7 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: 'daily'
              }
            },
            series30dOHLCUSD: {
              alias: 'series30dVolumeUSD',
              label: gettextCatalog.getString('30 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: '2-day'
              }
            }
          }
        },
        {
          id: 'seriesMACD',
          name: 'MACD',
          options: {
            plot: 'macd'
          },
          // Uses OHLC data.
          elements: {
            series1dOHLCUSD: {
              alias: 'series1dVolumeUSD',
              label: gettextCatalog.getString('1 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%H:%M',
                timeInterval: '3-hour'
              }
            },
            series7dOHLCUSD: {
              alias: 'series7dVolumeUSD',
              label: gettextCatalog.getString('7 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: 'daily'
              }
            },
            series30dOHLCUSD: {
              alias: 'series30dVolumeUSD',
              label: gettextCatalog.getString('30 day'),
              description: '',
              unit: 'USD',
              options: {
                timeFormat: '%b %e',
                timeInterval: '2-day'
              }
            }
          }
        },
        {
          id: 'marketStats',
          name: 'Market statistics',
          elements: {
            price: {
              label: gettextCatalog.getString('Market Price'),
              description: '',
              unit: 'USD'
            },
            open: {
              label: gettextCatalog.getString('Today\'s Open'),
              description: '',
              unit: 'USD'
            },
            high: {
              label: gettextCatalog.getString('Today\'s High'),
              description: '',
              unit: 'USD'
            },
            low: {
              label: gettextCatalog.getString('Today\'s Low'),
              description: '',
              unit: 'USD'
            },
            changePercent: {
              label: gettextCatalog.getString('Change'),
              description: '',
              unit: '%'
            },
            changeUSD: {
              label: gettextCatalog.getString('Change'),
              description: '',
              unit: 'USD'
            },
            timestamp: {
              label: gettextCatalog.getString('Last Updated'),
              description: '',
              unit: ''
            }
          }
        }
      ]
    },
    //////////////////////////////////////////////////////////////////////////
    ///
    /// Network data
    /// 
    network: {
      sources: {
        none: {
          id: 'none',
          name: gettextCatalog.getString('None'),
          title: '',
          description: '',
          url: '',
          category: 'network',
          icon: 'img/ds/icon-none.png',
          logo: ''
        }
      },
      groups: [
        {
          id: 'networkStats',
          name: gettextCatalog.getString('Network statistics'),
          elements: {
            price: {
              label: gettextCatalog.getString('Market Price'),
              description: '',
              unit: 'USD'
            },
            marketCap: {
              label: gettextCatalog.getString('Market Cap'),
              description: '',
              unit: 'USD'
            },
            hashRate: {
              label: gettextCatalog.getString('Hash Rate'),
              description: '',
              unit: 'GH/s'
            },
            totalFeesBTC: {
              label: gettextCatalog.getString('Total Transaction Fees'),
              description: '',
              unit: 'BTC'
            },
            numberBTCMined: {
              label: gettextCatalog.getString('Bitcoins Mined'),
              description: '',
              unit: 'BTC'
            },
            numberTx: {
              label: gettextCatalog.getString('No. of Transactions'),
              description: '',
              unit: ''
            },
            numberBlocksMined: {
              label: gettextCatalog.getString('Blocks Mined'),
              description: '',
              unit: ''
            },
            timeBetweenBlocks: {
              label: gettextCatalog.getString('Time Between Blocks'),
              description: '',
              unit: 'Mins'
            },
            totalBitcoin: {
              label: gettextCatalog.getString('Total Bitcoins'),
              description: '',
              unit: 'BTC'
            },
            numberBlockTotal: {
              label: gettextCatalog.getString('Total Blocks'),
              description: '',
              unit: ''
            },
            estimatedTransactionVolumeUSD: {
              label: gettextCatalog.getString('Est. Transaction Volume'),
              description: '',
              unit: 'USD'
            },
            blocksSize: {
              label: gettextCatalog.getString('Blocks Size '),
              description: '',
              unit: ''
            },
            minersRevenueUSD: {
              label: gettextCatalog.getString('Total Miners Revenue'),
              description: '',
              unit: 'USD'
            },
            nextRetarget: {
              label: gettextCatalog.getString('Next Retarget Block'),
              description: '',
              unit: ''
            },
            difficulty: {
              label: gettextCatalog.getString('Difficulty'),
              description: '',
              unit: ''
            },
            estimatedBTCSent: {
              label: gettextCatalog.getString('Est. Transaction Volume'),
              description: '',
              unit: 'BTC'
            },
            minersRevenueBTC: {
              label: gettextCatalog.getString('Total Miners Revenue'),
              description: '',
              unit: 'BTC'
            },
            totalBTCSent: {
              label: gettextCatalog.getString('Total Output Volume'),
              description: '',
              unit: ''
            },
            tradeVolumeBTC: {
              label: gettextCatalog.getString('Trade Volume'),
              description: '',
              unit: 'BTC'
            },
            tradeVolumeUSD: {
              label: gettextCatalog.getString('Trade Volume'),
              description: '',
              unit: 'USD'
            },
            rewardPerBlock: {
              label: gettextCatalog.getString('Reward Per Block'),
              description: '',
              unit: 'XBT'
            },
            timestamp: {
              label: gettextCatalog.getString('Last Updated'),
              description: '',
              unit: ''
            }
          }
        }
      ]
    }
  };

  root.categoryList = function() {
    // Exclude keys that are not category names.
    return lodash.filter(Object.keys(_data), function(k) {
      return ['info', 'views'].indexOf(k) < 0;
    });
  };

  root.getView = function(viewName) {
    loadData();
    return _data.views[viewName];
  };

  // Maps retrieved data source data to _data and returns the result.
  var loadData = function() {
    // Init the view.
    var view = _data.views.default;
    view.info = _data.info;

    for(var i = 0; i < _dataServices.length; i++) {
      var serviceName = _dataServices[i];
      try {
        var service = $injector.get(serviceName);
        var serviceInfo = service.getInfo();
        var segments = _data[serviceInfo.category];

        // Define the view key for this category.
        view[serviceInfo.category] = view[serviceInfo.category] || {};
        var viewCategory = view[serviceInfo.category];

        Object.keys(segments).forEach(function(seg) {

          switch (seg) {
            case 'sources':
              segments[seg][serviceInfo.id] = serviceInfo;

              // Add service info to view.
              viewCategory[seg] = segments[seg];
              break;

            case 'groups':
              // Get all data groups.
              var groups = segments[seg];
              for (var i = 0; i < groups.length; i++) {
                // Get data elements that need service bindings.
                var elements = groups[i].elements;
                Object.keys(elements).forEach(function(elem) {
                  elements[elem][serviceInfo.id] = service.get(elem);

                  // Add element to the view.
                  // An alias allows reuseable mapping of source data to view data. Prefer alias over element name.
                  var elemId = (elements[elem].alias ? elements[elem].alias : elem);
                  viewCategory[elemId] = elements[elem];
                  viewCategory[elemId].name = groups[i].name;
                  lodash.merge(viewCategory[elemId].options, groups[i].options);
                });
              }
              break;
          }
        });
      } catch(e) {
        // Log and continue.
        $log.warn('Bitcoin data service, could not get data: ' + serviceName);
        continue;
      }
    }
    return _data;
  };

  root.isAvailable = function() {
    return _isAvailable;
  };

  root.whenAvailable = function(cb, count) {
    count = count || 0;
    if (root.isAvailable()) {
      setTimeout(cb, 1);
    } else {
      _queued.push({
        callback: cb,
        count: count
      });
    }
  };

  root.refresh = function() {
    fetch();
  };

  root.getConfig = function(cb) {
    dataService.getConfig(function(config) {
      cb({
        enabled: config.enabled && config.bitcoinDataService.enabled,
        charts: JSON.parse(config.bitcoinDataService.charts),
        marketSource: config.bitcoinDataService.marketSource,
        networkSource: config.bitcoinDataService.networkSource
      });
    });
  };

  root.setConfig = function(config, cb) {
    if (config.charts) {
      config.charts = JSON.stringify(config.charts);
    }

    var opts = {
      dataServices: {
        bitcoinDataService: config
      }
    };
    configService.set(opts, function(err) {
      if (err) return cb(err);

      // Configure the services according to changed settings.
      configureServices(function() {
        // Perform an immediate fetch to update data using new config.
        fetch();
      });
    });
  };

  var configureServices = function(cb) {
    dataService.getConfig(function(dsConfig) {
      var config = dsConfig.bitcoinDataService;
      var enabled = dsConfig.enabled && config.enabled;

      for (var i = 0; i < _dataServices.length; i++) {
        try {
          var service = $injector.get(_dataServices[i]);
          var serviceInfo = service.getInfo();

          if (enabled && (serviceInfo.id == config.marketSource.id || serviceInfo.id == config.networkSource.id)) {
            service.enable();
            $log.info('Data service enabled: ' + serviceInfo.name);
          } else {
            service.disable();
          }
        } catch(e) {
          // Log and continue.
          $log.warn('Data service configuration failed: ' + service);
        }
      }
      cb();
    });
  };

  var fetch = function() {
    var _retrieve = function() {
      async.eachSeries(_dataServices, function(serviceName, callback) {
        try {
          var service = $injector.get(serviceName);
          service.fetch(function() {
            callback();
          });
        } catch(e) {
          // Log and continue.
          $log.error('Data service fetch failed: ' + serviceName + ', ' + e.message);
          callback();
        }
      }, function() {
        // done
        _isAvailable = true;
        $rootScope.$emit('Local/BitcoinDataServiceUpdate');

        lodash.each(_queued, function(queueEntry) {
          setTimeout(queueEntry.callback, 1);
          queueEntry.count -= 1;
        });
        cleanQueue();

        // Reschedule.
        dataService.getConfig(function(config) {
          // Allow only one scheduled retriever.
          if (_retriever) {
            clearTimeout(_retriever);
          }
          if (config.refreshPeriod > 0) {
            _retriever = setTimeout(_retrieve, config.refreshPeriod * 60 * 1000);
          }
        });
      });
    };

    _retrieve();
  };

  var cleanQueue = function() {
    _queued = lodash.reject(_queued, function(entry) {
      return entry.count < 0;
    });
  };

  $rootScope.$on('Local/DataServiceChange', function(event, config) {
    if (config.refreshPeriod > 0) {
      configureServices(function() {
        fetch();
      });
    }
  });

  // Configure the data services and start fetching data.
  configureServices(function() {
    fetch();
  });

  return root;
  
});
