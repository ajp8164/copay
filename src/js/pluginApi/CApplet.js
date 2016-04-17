'use strict';
angular.module('copayApp.api').factory('CApplet', function (lodash, PluginRegistry) {

  /////////////////////////////////////////////////////////////////////////////////////////////
  //
  // ROOT SCOPE
  //
  // Root scope provides access to applet services and properties.
  // Suitable for call from views.
  // 
  // appletService.open - Open an applet.
  //   <div ng-click="applet.open(applet)"></div>
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
  /////////////////////////////////////////////////////////////////////////////////////////////
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
  // 
  /////////////////////////////////////////////////////////////////////////////////////////////

  var _applet;

  /**
   * Constructor.  An instance of this class must be obtained from CContext.
   * @param {Applet} applet - An internal Applet object.
   * @return {Object} An instance of CApplet.
   * @constructor
   */
  function CApplet(applet) {
    lodash.assign(this, applet);
    _applet = applet;
    return this;
  };

  /**
   * Retrieve a service object by id.
   * @param {String} pluginId - The plugin ID that identifies a registered service.
   * @return {Object} An instance of a service object.
   */
  CApplet.prototype.getService = function(pluginId) {
    return _applet.getService(pluginId);
  };

  /**
   * Returns the constructed path to an applet public resource (e.g., an image).
   * @param {String} resource - A resource name.
   * @return {String} The path to the specified resource.
   */
  CApplet.prototype.path = function(resource) {
    return PluginRegistry.getEntry(this.header.pluginId).path + resource;
  };

  /**
   * Set or get an applet property. Available property names are:
   *   'title' - set the applet header bar text.
   * @param {String} name - The applet property name to set or get.
   * @param {String} [value] - The value to set.
   * @return {String} The value of the specified property.
   */
  CApplet.prototype.property = function(name, value) {
    return _applet.property(name, value);
  };

  return CApplet;
});
