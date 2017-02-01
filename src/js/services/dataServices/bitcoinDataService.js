'use strict';

angular.module('copayApp.services').factory('bitcoinDataService', function($rootScope, $log, $injector, lodash, configService, gettextCatalog, dataService) {
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
      series1dCloseUSD: {
        label: gettextCatalog.getString('Market Price, 1 day'),
        description: '',
        unit: 'USD',
        kind: 'series',
        chart: {
          techan: {
            plot: 'close',
            cssClass: 'close'
          }
        }
      },
      series7dCloseUSD: {
        label: gettextCatalog.getString('Market Price, 7 day'),
        description: '',
        unit: 'USD',
        kind: 'series',
        chart: {
          techan: {
            plot: 'close',
            cssClass: 'close'
          }
        }
      },
      series30dCloseUSD: {
        label: gettextCatalog.getString('Market Price, 30 day'),
        description: '',
        unit: 'USD',
        kind: 'series',
        chart: {
          techan: {
            plot: 'close',
            cssClass: 'close'
          }
        }
      },
      series1dOHLCUSD: {
        label: gettextCatalog.getString('OHLC, 1 day'),
        description: '',
        unit: 'USD',
        kind: 'series',
        chart: {
          techan: {
            plot: 'ohlc',
            cssClass: 'ohlc'
          }
        }
      },
      series7dOHLCUSD: {
        label: gettextCatalog.getString('OHLC, 7 day'),
        description: '',
        unit: 'USD',
        kind: 'series',
        chart: {
          techan: {
            plot: 'ohlc',
            cssClass: 'ohlc'
          }
        }
      },
      series30dOHLCUSD: {
        label: gettextCatalog.getString('OHLC, 30 day'),
        description: '',
        unit: 'USD',
        kind: 'series',
        chart: {
          techan: {
            plot: 'ohlc',
            cssClass: 'ohlc'
          }
        }
      },
      price: {
        label: gettextCatalog.getString('Market Price'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      open: {
        label: gettextCatalog.getString('Today\'s Open'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      high: {
        label: gettextCatalog.getString('Today\'s High'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      low: {
        label: gettextCatalog.getString('Today\'s Low'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      changePercent: {
        label: gettextCatalog.getString('Change'),
        description: '',
        unit: '%',
        kind: 'single'
      },
      changeUSD: {
        label: gettextCatalog.getString('Change'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      timestamp: {
        label: gettextCatalog.getString('Last Updated'),
        description: '',
        unit: '',
        kind: 'single'
      }
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
      price: {
        label: gettextCatalog.getString('Market Price'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      marketCap: {
        label: gettextCatalog.getString('Market Cap'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      hashRate: {
        label: gettextCatalog.getString('Hash Rate'),
        description: '',
        unit: 'GH/s',
        kind: 'single'
      },
      totalFeesBTC: {
        label: gettextCatalog.getString('Total Transaction Fees'),
        description: '',
        unit: 'BTC',
        kind: 'single'
      },
      numberBTCMined: {
        label: gettextCatalog.getString('Bitcoins Mined'),
        description: '',
        unit: 'BTC',
        kind: 'single'
      },
      numberTx: {
        label: gettextCatalog.getString('No. of Transactions'),
        description: '',
        unit: '',
        kind: 'single'
      },
      numberBlocksMined: {
        label: gettextCatalog.getString('Blocks Mined'),
        description: '',
        unit: '',
        kind: 'single'
      },
      timeBetweenBlocks: {
        label: gettextCatalog.getString('Time Between Blocks'),
        description: '',
        unit: 'Mins',
        kind: 'single'
      },
      totalBitcoin: {
        label: gettextCatalog.getString('Total Bitcoins'),
        description: '',
        unit: 'BTC',
        kind: 'single'
      },
      numberBlockTotal: {
        label: gettextCatalog.getString('Total Blocks'),
        description: '',
        unit: '',
        kind: 'single'
      },
      estimatedTransactionVolumeUSD: {
        label: gettextCatalog.getString('Est. Transaction Volume'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      blocksSize: {
        label: gettextCatalog.getString('Blocks Size '),
        description: '',
        unit: '',
        kind: 'single'
      },
      minersRevenueUSD: {
        label: gettextCatalog.getString('Total Miners Revenue'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      nextRetarget: {
        label: gettextCatalog.getString('Next Retarget Block'),
        description: '',
        unit: '',
        kind: 'single'
      },
      difficulty: {
        label: gettextCatalog.getString('Difficulty'),
        description: '',
        unit: '',
        kind: 'single'
      },
      estimatedBTCSent: {
        label: gettextCatalog.getString('Est. Transaction Volume'),
        description: '',
        unit: 'BTC',
        kind: 'single'
      },
      minersRevenueBTC: {
        label: gettextCatalog.getString('Total Miners Revenue'),
        description: '',
        unit: 'BTC',
        kind: 'single'
      },
      totalBTCSent: {
        label: gettextCatalog.getString('Total Output Volume'),
        description: '',
        unit: '',
        kind: 'single'
      },
      tradeVolumeBTC: {
        label: gettextCatalog.getString('Trade Volume'),
        description: '',
        unit: 'BTC',
        kind: 'single'
      },
      tradeVolumeUSD: {
        label: gettextCatalog.getString('Trade Volume'),
        description: '',
        unit: 'USD',
        kind: 'single'
      },
      rewardPerBlock: {
        label: gettextCatalog.getString('Reward Per Block'),
        description: '',
        unit: 'XBT',
        kind: 'single'
      },
      timestamp: {
        label: gettextCatalog.getString('Last Updated'),
        description: '',
        unit: '',
        kind: 'single'
      }
    }
  };

  // Maps retrievec data source data to _data and returns the result.
  root.getData = function() {
    for(var i = 0; i < _dataServices.length; i++) {
      var serviceName = _dataServices[i];
      try {
        var service = $injector.get(serviceName);
        var serviceInfo = service.getInfo();

        Object.keys(_data[serviceInfo.category]).forEach(function(elem) {
          if (elem == 'sources') {
            _data[serviceInfo.category][elem][serviceInfo.id] = serviceInfo;
          } else {
            // All other keys are data elements that need service bindings.
            _data[serviceInfo.category][elem][serviceInfo.id] = service.get(elem);
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
