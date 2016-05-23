'use strict';

angular.module('copayApp.api').service('getScope', function($rootScope, isCordova, isChromeApp, isMobile, nodeWebkit) {

	var root = {};

  root.respond = function(message, callback) {
    message.response = {
      statusCode: 200,
      statusText: 'OK',
      data: {
      	applet: $rootScope.applet,
        env: {
          isCordova: isCordova,
          isChromeApp: isChromeApp,
          isNodeWebkit: nodeWebkit.isDefined(),
          isMobile: {
            any: isMobile.any(),
            iOS: isMobile.iOS(),
            Android: isMobile.Android(),
            Windows: isMobile.Windows()
          },
          hasStatusBar: isMobile.iOS() && isCordova
        }
      }
    };
    return callback(message);
  };

  return root;
});
