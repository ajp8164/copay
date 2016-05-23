'use strict';

angular.module('copayApp.api').service('start', function() {

	var root = {};

  root.respond = function(message, callback) {
    message.response = {
      statusCode: 200,
      statusText: 'OK',
      data: {}
    };
    return callback(message);
  };

  return root;
});
