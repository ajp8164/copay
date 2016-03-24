'use strict';

angular.module('copayApp.controllers').controller('sidebarRightController', function($rootScope, $scope, $log, themeService, dragulaService) {

  var self = this;
  this.applets = [];

  $rootScope.$on('Local/ThemeUpdated', function(event) {
    self.applets = themeService.getAppletSkins();
  });

  $scope.$on('applet-bag.drop-model', function (e, el) {
    $log.debug('drop event');
  });

});
