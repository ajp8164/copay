'use strict';

angular.module('copayApp.controllers').controller('preferencesUserController', function($scope, $timeout, $log, configService, profileService, pushNotificationsService, go, lodash, platformInfo) {

    var isIOS = platformInfo.isIOS;
    var isAndroid = platformInfo.isAndroid;
    var config = configService.getSync();
    this.user = lodash.clone(config.user);

    function subscribeToNotifications(user, cb) {
      if (lodash.isEmpty(user)) {
        return cb('You must provide an ID');
      }

      var opts = {
        type: isIOS ? "ios" : isAndroid ? "android" : null,
        user: user,
        token: pushNotificationsService.token
      };

      // Using focusedClient only to gain access to the BWC API for setting the subscription.
      pushNotificationsService.subscribe(opts, profileService.focusedClient, function(err, response) {
        if (err) $log.warn('Subscription error: ' + err.message + ': ' + JSON.stringify(opts));
        else $log.debug('Subscribed to push notifications service: (' + user + ')' + JSON.stringify(response));
        return cb();
      });
    };

    function unsubscribeFromNotifications(user, cb) {
      if (lodash.isEmpty(user)) {
        return cb();
      }

      var opts = {
        user: user
      };

      // Using focusedClient only to gain access to the BWC API for setting the subscription.
      pushNotificationsService.unsubscribe(opts, profileService.focusedClient, function(err, response) {
        if (err) $log.warn('Unsubscribe error: ' + err.message + ': ' + JSON.stringify(opts));
        else $log.debug('Unsubscribed from push notifications service: (' + user + ')' + JSON.stringify(response));
        return cb();
      });
    };

    this.save = function() {
      var self = this;
      var opts = {
        user: {
          id: {}
        }
      };
      opts.user.id = self.user.id;

      // Unsubscribe from prior user id, subscribe to new user id, and save configuration.
      unsubscribeFromNotifications(config.user.id, function(err) {
        if (err) {
          self.error = err;
          return;
        }

        subscribeToNotifications(opts.user.id, function(err) {
          if (err) {
            self.error = err;
            return;
          }

          configService.set(opts, function(err) {
            if (err) {
              $scope.$emit('Local/DeviceError', err);
              return;
            }
            $scope.$emit('Local/UserUpdated');
            $timeout(function(){
              go.path('preferencesGlobal');
            }, 50);
          });
        });
      });
    };

  });
