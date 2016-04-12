'use strict';
angular.module('copayApp.api').factory('copayAppletApi', function(appletService) {

  var root = {};

	// Root scope provides access to applet services and properties.
	// Suitable for call from views.
	// 
	// appletService.open - Open an applet.
	//   <div ng-click="applet.open(applet)"></div>
	//   <div ng-click="applet.open('my-applet')"></div>  [ *** deprecated *** ]
	//   
	// appletService.close - Close an open applet
	//   <div ng-click="applet.close()"></div>
	//   
	// applet.path - Return the qualified path to the specified resource.
	//   <img ng-src="{{applet.path('img/my-image.png')}}">
	//   
	// applet.model - Applet model property.
	//   <circular-slider
	//     max="{{c.applet.model.csMaximum}}">
	//   </circular-slider>
	//   
	// applet.view - Applet view property.
	//   <div ng-style="{'background':applet.view.background}"></div>
	//   
	// applet.u.* - Applet user properties.
	//   <div ng-style="{'color':applet.u.my-color}"></div>
	//   
	// EVENTS
	// 
	// Each of the following events provide the following arguments to the subscriber:
	// applet - the subject Applet
	// walletId - the wallet identifier on which the applet is presented
	// 
  // 'Local/AppletEnter' - broadcast when opening an applet, before the applet is shown
  // 'Local/AppletShown' - broadcast when opening an applet, after the applet is shown
  // 'Local/AppletLeave' - broadcast when closing an applet, before before the applet is hidden
  // 'Local/AppletHidden' - broadcast when closing an applet, after the applet is hidden

	// Return the applet from the current skin.
	// 
	root.getApplet = function() {
	  return appletService.getApplet();
	};

	// Return the applet session.
	// 
	root.getSession = function() {
	  return appletService.getSession(root.getApplet());
	};

	// Return the path to the applets public uri.
	// 
	root.appletPath = function(uri) {
	  return appletService.appletPath();
	};

	// Open the specified applet on the current wallet.
	// 
	root.openApplet = function(applet) {
		appletService.doOpenApplet(applet);
  };

	// Close the current applet and return to the prior skin.
	// 
	root.closeApplet = function() {
		appletService.doCloseApplet(root.getApplet());
	};

  return root;
});