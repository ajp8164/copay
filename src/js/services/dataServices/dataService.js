'use strict';

angular.module('copayApp.services').factory('dataService', function($log, $http) {
  var root = {};

  // Return the data value from the service cache.
  root.get = function(service, name) {
    var value = undefined;
    // Look through all the sources until we find the data name.
    for (var i = 0; i < service.sources.length; i++) {
      if (service.sources[i].data[name]) {
        // Found
        value = service.sources[i].data[name].value;
        break;
      }
    };
    return value;
  };

  // Fetch all data from the source and populate the local service cache.  The value of a piece of data
  // will be undefined until it is populated.
  root.fetch = function(service, cb) {
    Object.asyncEach(service.sources, function(source, callback) {
      if (source.api.toUrl) {
        _fetchWithQuery(source, function() {
          return callback();
        });
      } else {
        _fetch(source, function() {
          return callback();
        });
      }
    }, function() {
      // done
      cb();
    });
  };

  var _fetch = function(source, cb) {
    _doGet(source.api.url,
      function(data) { // GET success
        if (data && data.error) {
          $log.error('Failed to get data from ' + source.api.url + ': ' + data.error);
          return cb();
        }
        Object.keys(source.data).forEach(function(k) {
          var stat = source.data[k];
          var rawValues = [];
          if (stat.params.length > 0) {
            for (var p = 0; p < stat.params.length; p++) {
              rawValues[p] = Object.resolve(stat.params[p], data.data);
            }
          } else {
            // No params so pass the received data directly into the transform.
            rawValues = data.data;
          }
          stat.value = stat.toValue(rawValues);
        });
        return cb();
      },
      function(data) { // GET error
        $log.error('Failed to get data from ' + source.api.url + ': ' + data.data.message);
        return cb();
      }
    );
  };

  var _fetchWithQuery = function(source, cb) {
    Object.asyncEach(Object.keys(source.data), function(k, callback) {
      var stat = source.data[k];
      var sourceUrl = source.api.toUrl(stat.query);
      _doGet(sourceUrl,
        function(data) { // GET success
          if (data && data.error) {
            $log.error('Failed to get data from ' + sourceUrl + ': ' + data.error);
            return callback();
          }
          var rawValues = [];
          if (stat.params.length > 0) {
            for (var p = 0; p < stat.params.length; p++) {
              rawValues[p] = Object.resolve(stat.params[p], data.data);
            }
          } else {
            // No params so pass the received data directly into the transform.
            rawValues = data.data;
          }
          stat.value = stat.toValue(rawValues);
          return callback();
        },
        function(data) { // GET error
          $log.error('Failed to get data from ' + sourceUrl + ': ' + data.data.message);
          return callback();
        }
      );
    }, function() {
      //done
      cb();
    });
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

  Object.resolve = function(path, obj) {
    return path.split('.').reduce(function(prev, curr) {
      return prev ? prev[curr] : undefined
    }, obj || self)
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

  return root;
  
});
