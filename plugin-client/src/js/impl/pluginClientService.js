'use strict';

angular.module('copayPluginClient').service('pluginClientService', function ($log, $rootScope, $injector, $timeout, lodash, ApiMessage, CError) {

  var root = {};
  var host = window.parent;
  var REQUEST_TIMEOUT = 3000; // milliseconds

  var START_URL = '/start';
  var SCOPE_URL = '/scope';

  var clientServiceState = {
    statusCode: -1,
    statusText: ''
  };

  var sequence = 0;
  var promises = [];

  root.sendMessage = function(request) {
    return new Promise(function(resolve, reject) {

      var onComplete = function(message) {
        if (message.response.statusCode >= 200 &&
          message.response.statusCode <= 299) {

          if (!lodash.isUndefined(message.request.responseObj)) {
            // Create an instance of the promised responseObj with the message data.
            var responseObj = $injector.get(message.request.responseObj);
            responseObj = eval(new responseObj(message.response.data.obj));
          } else {
            // Send the plain response object data if no responseObj set.
            // The receiver will have to know how to interpret the object.
            responseObj = message.response;
          }

          resolve(responseObj);

        } else {

          var responseObj = new CError(message);
          reject(responseObj);
        }
      };

      // Create a new request message.
      var message = new ApiMessage(request, sequence++);

      // Send the message only if the client is OK or if the purpose of the message is to
      // start the client.
      if (clientServiceIsOK() || isStartMessage(message)) {

        // Set a communication timeout timer.
        var timeoutTimer = $timeout(function() {
          timeout(message);
        }, REQUEST_TIMEOUT);

        // Store the promise callback for execution when a message is received.
        promises.push({
          id: message.header.id,
          onComplete: onComplete,
          timer: timeoutTimer
        });

        message.send(host);

      } else {

        // The client service is not ready. Short circuit the communication and immediatley respond.
        message.response = {
          statusCode: 503,
          statusText: 'Client service is not ready.',
          data: {}
        };
        onComplete(message);

      }
    });
  };

  function init() {
    window.addEventListener('message', receiveMessage.bind(this));
    start();
    return this;
  };

  function start() {
    var request = {
     method: 'POST',
     url: START_URL,
     data: {}
    }

    root.sendMessage(request).then(function(response) {
      $log.info('[client] START: ' + response.statusText + ' (' + response.statusCode + ')');

      clientServiceState = {
        statusCode: 200,
        statusText: response.statusText
      };

      root.refreshScope(function(error) {
        $rootScope.$emit('Client/Start', error);
      });

    }, function(error) {
      $log.error('[client] START ERROR: ' + error.message + ' (' + error.statusCode + ')');

      clientServiceState = {
        statusCode: error.statusCode,
        statusText: error.message
      };
      $rootScope.$emit('Client/Start', error);

    });
  };

  root.refreshScope = function(callback) {
    var request = {
     method: 'GET',
     url: SCOPE_URL
    }

    root.sendMessage(request).then(function(response) {
      $log.info('[client] SCOPE: ' + response.statusText + ' (' + response.statusCode + ')');

      // Apply the response to the clients root scope.
      $rootScope.env = response.data.env;
      $rootScope.applet = response.data.applet;

      $timeout(function() {
        $rootScope.$apply();
      });

      if (callback) {
        callback();
      }
      
    }, function(error) {
      $log.error('[client] SCOPE ERROR: ' + error.message + ' (' + error.statusCode + ')');
      callback(error);
    });
  };

  function clientServiceIsOK() {
    return clientServiceState.statusCode >= 200 && clientServiceState.statusCode <= 299;
  };

  function isStartMessage(message) {
    return message.request.url == START_URL;
  };

  function receiveMessage(event) {
    var message;

    try {
      message = new ApiMessage(event);

      // $log.info('[client] receive  ' + message.header.sequence + ': ' + message.serialize() + ' (from ' + message.event.source.location.toString() + ')');

      var promiseIndex = lodash.findIndex(promises, function(promise) {
        return promise.id == message.header.id;
      });

      if (promiseIndex >= 0) {
        // Remove the promise from the list.
        // Cancel the timeout timer.
        // Deliver the response to the client.
        var promise = lodash.pullAt(promises, promiseIndex);
        $timeout.cancel(promise[0].timer);
        promise[0].onComplete(message);

      } else {
        $log.debug('Message received but there is no promise to fulfill: ' + message.serialize());
      }      

    } catch (ex) {

      // Not possible to notify client since the message is invalid.
      // The client will timeout if a valid response is not received.
      $log.error('[client] ERROR: invalid message received, ' + ex.message + ' - '+ angular.toJson(event));
    }
  };

  function timeout(message) {
    $log.debug('Applet client request timeout: ' + message);

    var promiseIndex = lodash.findIndex(promises, function(promise) {
      return promise.id == message.header.id;
    });

    if (promiseIndex >= 0) {
      var promise = lodash.pullAt(promises, promiseIndex);

      message.response = {
        statusCode: 408,
        statusText: 'Request timed out.',
        data: {}
      }
      promise[0].onComplete(message);
    } else {
      $log.debug('Message request timed out but there is no promise to fulfill: ' + message.serialize());
    }
  };

  init();

  return root;
});
