'use strict';

angular.module('copayApp.controllers').controller('preferencesUserController', function($scope, $timeout, $log, configService, profileService, pushNotificationsService, go, lodash, platformInfo, bpcService) {

    var self = this;
    var isIOS = platformInfo.isIOS;
    var isAndroid = platformInfo.isAndroid;
    var supportsPushNotifications = isIOS || isAndroid;
    var config = configService.getSync();
    this.user = lodash.clone(config.user);
    this.bitpay = bpcService.getClient();

    this._subscribeToNotifications = function(user, cb) {
      if (lodash.isEmpty(user)) {
        return cb('You must provide an ID');
      }

      var opts = {
        subscriberId: user,
        deviceToken: pushNotificationsService.token,
        deviceType: isIOS ? 'ios' : isAndroid ? 'android' : 'unsuppported'
      };

      self.bitpay.subscribeToNotifications(opts, function(err, response) {
        if (err) {
          $log.error('Subscribe error: ' + err.message);
          return cb('Could not subscribe for notifications.');
        }
        $log.debug('Subscribed to push notifications service');
        return cb();
      });
    };

    this._unsubscribeFromNotifications = function(cb) {
      var opts = {
        deviceToken: pushNotificationsService.token
      };

      self.bitpay.unsubscribeFromNotifications(opts, function(err, response) {
        if (err) {
          $log.error('Unsubscribe error: ' + err.message);
          return cb('Could not unsubscribe from notifications.');
        }
        $log.debug('Unsubscribed from push notifications service');
        return cb(err);
      });
    };

    this._subscribe = function(callback) {
      // Unsubscribe prior user id, subscribe new user id, and save configuration.
      self._unsubscribeFromNotifications(function(err) {
        if (err) {
          self.error = err.message;
          return callback(err);
        }

        self._subscribeToNotifications(self.user.id, function(err) {
          if (err) {
            self.error = err.message;
            return callback(err);
          }

          callback();
        });
      });
    };

    this._save = function(callback) {
      var opts = {
        user: {
          id: self.user.id
        }
      };

      configService.set(opts, function(err) {
        if (err) {
          $scope.$emit('Local/DeviceError', err);
          return callback(err);
        }
        callback();
      });
    };

    this.save = function() {
      self._save(function(err) {
        if (!err) {
          if (supportsPushNotifications) {
            self._subscribe(function(err) {
              if (!err) {
                $scope.$emit('Local/UserUpdated');
                $timeout(function(){
                  go.path('preferencesGlobal');
                }, 50);
              } else {
                $timeout(function(){
                  $scope.$apply();
                });
              }
            });
          } else {
            $scope.$emit('Local/UserUpdated');
            $timeout(function(){
              go.path('preferencesGlobal');
            }, 50);
          }
        } else {
          $timeout(function(){
            $scope.$apply();
          });
        }
      });
    };

  });
