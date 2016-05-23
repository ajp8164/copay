'use strict';

angular.module('copayPluginClient').factory('ApiMessage', function ($log, lodash) {

  var self;

  function ApiMessage(eventOrRequest, sequence) {
    self = this;
    self.event = {};

    // Sequence must not be provided with an event.
    if (lodash.isUndefined(sequence)) {
      var event = eventOrRequest;

      if (lodash.isUndefined(event) || !(event instanceof MessageEvent)) {
        throw Error('event is not a MessageEvent');
      }

      // Construct a message from the event data.
      self.event = event;

      // Check the itegrity of the message event.
      validateEvent();

      // Assign the event message data to this message object and make alias assignments.
      var data = JSON.parse(self.event.data);
      lodash.assign(self, data);

    } else {
      var request = eventOrRequest;

      // Construct a new message from the data and make alias assignments.
      self.header = {
        sequence: (!lodash.isUndefined(sequence) ? sequence : -1),
        id: '' + new Date().getTime(),
        timestamp: new Date()
      };
      self.request = request || {};
      self.response = {};
    }

    return self;
  };

  ApiMessage.prototype.send = function(host) {
    $log.info('[client] REQUEST  ' + self.header.sequence + ': ' + angular.toJson(transport()));
    host.postMessage(angular.toJson(transport()), '*');
  };

  ApiMessage.prototype.serialize = function() {
    return angular.toJson(transport());
  };

  function transport() {
    return {
      header: self.header,
      request: self.request,
      response: self.response
    }
  };

  function validateEvent() {
    if(lodash.isUndefined(self.event.data)) {

      // Invalid event.
      self.response = {
        statusCode: 500,
        statusText: 'Invalid message event, no \'data\' found.',
        data: {}
      };
      throw new Error();

    } else if (!lodash.isString(self.event.data)) {

      // Event data not a string.
      self.response = {
        statusCode: 500,
        statusText: 'Invalid message event data, expected string argument but received object.',
        data: {}
      };
      throw new Error();
    }
  };

  return ApiMessage;
});
