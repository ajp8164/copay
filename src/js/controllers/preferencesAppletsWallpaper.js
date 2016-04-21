'use strict';

angular.module('copayApp.controllers').controller('preferencesAppletsWallpaperController',
  function($rootScope, $timeout, $log, appletCatalogService) {

  var self = this;

  this.currentWallpaperImage = function() {
    // Extract image url from background css
    // E.g., url(/themes/Cosmos/sidebar-right.png) 50% 0% / contain no-repeat rgb(0, 0, 0)
    var re = /(?:\(['|"]?)(.*?)(?:['|"]?\))/;
    return re.exec($rootScope.theme.view.sidebarRBackground)[1];
  };

  this.physicalScreenHeight = function() {
    var physicalScreenHeight = ((window.innerHeight > 0) ? window.innerHeight : screen.height);
    return physicalScreenHeight;
  };

  this.openFilePicker = function() {
    var srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
    var options = setOptions(srcType);

    navigator.camera.getPicture(
      function cameraSuccess(imageUrl) {
        saveAndSetImage(imageUrl);
    },
      function cameraError(error) {
        $log.debug('Unable to obtain picture: ' + error);
    },
    options);
  };

	function setOptions(srcType) {
    var options = {
      // Some common settings are 20, 50, and 100
      quality: 50,
      destinationType: Camera.DestinationType.FILE_URI,
      // In this app, dynamically set the picture source, Camera or photo gallery
      sourceType: srcType,
      encodingType: Camera.EncodingType.JPEG,
      mediaType: Camera.MediaType.PICTURE,
      allowEdit: true,
      correctOrientation: true  //Corrects Android orientation quirks
    }
    return options;
	}

  function saveAndSetImage(imageUrl) {
    var cat = {
      preferences: {
        wallpaperImageUrl: {}
      }
    };

    cat.preferences.wallpaperImageUrl = imageUrl;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }

      var catalog = appletCatalogService.getSync();
      setImage(catalog.preferences.wallpaperImageUrl);
    });
  };

  function setImage(imageUrl) {
    $rootScope.theme.view.sidebarRBackground = 'url(' + imageUrl + ') top / cover no-repeat #000000';
    $timeout(function() {
      $rootScope.$apply();
    });
  };

});
