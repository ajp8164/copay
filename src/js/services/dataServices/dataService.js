'use strict';

angular.module('copayApp.services').factory('dataService', function($rootScope, $log, $http, lodash, gettextCatalog, configService) {
  var root = {};

  root.refreshPeriods = [
    { label: gettextCatalog.getString('1 minute'),  title: gettextCatalog.getString('Every 1 minute'),  value: 1 },
    { label: gettextCatalog.getString('3 minutes'), title: gettextCatalog.getString('Every 3 minutes'), value: 3 },
    { label: gettextCatalog.getString('5 minutes'), title: gettextCatalog.getString('Every 5 minutes'), value: 5 },
    { label: gettextCatalog.getString('Never'),     title: gettextCatalog.getString('Never'),           value: 0 }
  ];

  root.getConfig = function(cb) {
    configService.whenAvailable(function(config) {
      cb(config.dataServices);
    });
  };

  root.setConfig = function(config, cb) {
    var opts = {
      dataServices: config
    };
    configService.set(opts, function(err) {
      if (err) {
        $log.debug(err);
      }
      root.getConfig(function(config) {
        // Trigger data service subscribers.
        $rootScope.$emit('Local/DataServiceChange', config);
      });

      cb(err);
    });
  };

  root.setEnabled = function(service, value) {
    for (var i = 0; i < service.sources.length; i++) {
      service.sources[i].meta.enabled = value;
    }
  };

  // Return the data value from the service cache or undefined.
  root.get = function(service, name) {
    var value = undefined;
    // Look through all the sources and queries until we find the data name.
    loop:
    for (var s = 0; s < service.sources.length; s++) {
      for (var q = 0; q < service.sources[s].queries.length; q++) {
        if (service.sources[s].queries[q].results[name]) {
          // Found
          value = service.sources[s].queries[q].results[name].value;
          break loop;
        }
      }
    }
    return value;
  };

  // Fetch all data from the source and populate the local service cache.  The value of a piece of data
  // will be undefined until it is populated.
  root.fetch = function(service, cb) {
    var didFetch = false;
    async.eachSeries(service.sources, function(source, callback) {
      if (source.meta.enabled) {
        if (!didFetch) $log.info('Data service: start fetching ' + service.info.name + ' data');
        $log.info('Source: ' + source.meta.description);
        _fetch(service, source, function() {
          didFetch = true;
          callback();
        });
      } else {
        callback();
      }
    }, function() {
      // done
      if (didFetch) $log.info('Data service: done fetching ' + service.info.name + ' data');
      cb();
    });
  };

  var _fetch = function(service, source, cb) {
    function _getValueThis(elemName, service) {
      var value;
      var q;
      var s = lodash.find(service.sources, function(source) {
        var query = lodash.find(source.queries, function(query) {
          return query.results[elemName] != undefined;
        });
        if (query != undefined) {
          q = query;
        }
        return (query != undefined);
      });

      if (s) {
        value = q.results[elemName].value;
      } else {
        $log.error(service.id + ': could not find elem this.' + elemName);
      }
      return value;
    };

    async.eachSeries(source.queries, function(query, callback_queries) {
      var sourceUrl = source.api.toUrl(query.params);
      _doGet(sourceUrl,
        function(result) { // GET success
          var err = _hasApiError(result, source.api.errorCheck);
          if (err) {
            $log.warn('Failed to get data from ' + sourceUrl + ': ' + err);
          } else {
            // No errors, get value(s) from response.
            async.eachSeries(Object.keys(query.results), function(k, callback_results) {
              var stat = query.results[k];
              var rawValues = [];
              if (stat.elems.length > 0) {
                // Element value path defined, get value from result using the path.
                // Each elem is an arg for toValue().
                for (var p = 0; p < stat.elems.length; p++) {
                  if (stat.elems[p].includes('this.')) {
                    // Handle 'this'; find arg value in our own data.
                    var elemName = stat.elems[p].slice(5, stat.elems[p].length);
                    rawValues[p] = _getValueThis(elemName, service)
                  } else {
                    // Find arg value in returned result.
                    rawValues[p] = lodash.get(result.data, stat.elems[p]);
                  }
                }
              } else {
                // No elems defined so pass the received data directly into the transform.
                rawValues = result.data;
              }
              stat.value = stat.toValue(rawValues);

              /*
              if (Array.isArray(stat.value.data)) {
                $log.debug(k + '; ' + stat.value.data.length + ' data elements');
              } else {
                $log.debug(k + '=' + JSON.stringify(stat.value));
              }
              */
              callback_results();
            }, function() {
              //done
              callback_queries();
            });
          }
        },
        function(result) { // GET error
          $log.warn('Failed to get data from ' + sourceUrl + ': ' + JSON.stringify(result));
            callback_queries();
        }
      );
    }, function() {
      // done
      cb();
    });
  };

  var _hasApiError = function(result, errorCheck) {
    // Check for API errors by using paths into the result and test values to check for an
    // error condition.
    var errorText = '';
    var value = lodash.get(result.data, errorCheck.path, '');
    var test = errorCheck.test;
    // If 'test' is undefined then we take the presence of a 'value' as an error, otherwise
    // check that the 'value' includes the error 'test' condition value.
    if ((test == undefined && value.length > 0) || value.includes(test)) {
      for (var m = 0; m < errorCheck.msgs.length; m++) {
        if (errorText.length > 0) {
          errorText += ', ';
        }
        errorText += lodash.get(result.data, errorCheck.msgs[m], ''); 
      }
    }
    return (errorText.length > 0 ? errorText : undefined);
  };

  var _doGet = function(endpoint, successCallback, errorCallback) {
    $http(_get(endpoint)).then(function(data) {
      successCallback(_errorCheck(data, endpoint), data);
    }, function(data) {
      errorCallback(data);
    });
  };

  var _doPost = function(endpoint, json, successCallback, errorCallback) {
    $http(_post(endpoint, json)).then(function(data) {
      successCallback(_errorCheck(data, endpoint), data);
    }, function(data) {
      errorCallback(data);
    });
  };

  var _get = function(endpoint) {
    return {
      method: 'GET',
      url: endpoint,
      headers: {
        'content-type': 'application/json'
      }
    };
  };

  var _post = function(endpoint, json) {
    return {
      method: 'POST',
      url: endpoint,
      headers: {
        'content-type': 'application/json',
      },
      data: json
    };
  };

  var _errorCheck = function(data, endpoint) {
    if (typeof data.data == 'string' && data.data.match(/^(invalid|error|)$/i)) {
      return {
        data: {
          error: data
        }
      };
    } else {
      return data;
    }
  };

  return root;
  
});
