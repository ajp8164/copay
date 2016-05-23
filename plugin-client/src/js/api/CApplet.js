'use strict';

angular.module('copayPluginClient').factory('CApplet', function (lodash, pluginClientService) {

  /**
   * Applet Properties.
   * ------------------
   * 
   * Root scope provides access to the folling applet functions and properties.
   * 
   * appletService.open - Open an applet.
   *   <div ng-click="applet.open(applet)"></div>
   *   
   * appletService.close - Close an open applet
   *   <div ng-click="applet.close()"></div>
   *   
   * applet.header - Applet header property.
   *   <span>{{applet.header.name}}</span>
   *   
   * applet.path - Return the qualified path to the specified resource.
   *   <img ng-src="{{applet.path+'img/my-image.png'}}">
   *   
   * applet.model - Applet model property.
   *   <circular-slider
   *     max="{{c.applet.model.csMaximum}}">
   *   </circular-slider>
   *   
   * applet.view - Applet view property.
   *   <div ng-style="{'background':applet.view.background}"></div>
   * 
   *
   * Applet Events.
   * --------------
   * 
   * Each of the following events provide the following arguments to the subscriber:
   *   applet - the subject Applet object
   *   walletId - the wallet identifier on which the applet is presented
   * 
   * 'Local/AppletEnter' - broadcast when opening an applet, before the applet is shown
   * 'Local/AppletShown' - broadcast when opening an applet, after the applet is shown
   * 'Local/AppletLeave' - broadcast when closing an applet, before before the applet is hidden
   * 'Local/AppletHidden' - broadcast when closing an applet, after the applet is hidden
   * 
   */

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
   * Initialize a plugin service.
   * @param {String} pluginId - The plugin ID that identifies a registered service.
   * @return {Promise<Object>} A promise for the specified service object.
   */
  CApplet.prototype.initService = function(pluginId) {
    var request = {
      method: 'POST',
      url: '/applet/' + this.header.appletId + '/service/' + pluginId + '/init',
      data: {}
    }

    pluginClientService.sendMessage(request);
  };

  /**
   * Hides the splash image after starting.
   * @return {Promise} A promise at completion.
   */
  CApplet.prototype.hideSplash = function() {
    var request = {
      method: 'POST',
      url: '/applet/' + this.header.appletId + '/config',
      data: {
        showSplash: false
      }
    }

    pluginClientService.sendMessage(request);
  };

  /**
   * Set or get an applet property. Available property names are:
   *   'title' - set the applet header bar text.
   * @param {String} name - The applet property name to set or get.
   * @param {String} [value] - The value to set.
   * @return {String} The value of the specified property.
   * @return {Promise<Object>} A promise for the value of the specified property.
   */
  CApplet.prototype.property = function(name, value) {
    var request = {
      method: 'POST',
      url: '/applet/' + this.header.appletId + '/property/' + name,
      data: {
        value: value
      }
    }

    pluginClientService.sendMessage(request).then(function(value) {
      pluginClientService.refreshScope();
      return value;
    });
  };

  /**
   * Set or get a set of applet properties. Available property names are:
   *   'title' - set the applet header bar text.
   * @param {String} name - The applet property name to set or get.
   * @param {String} [value] - The value to set.
   * @return {Promise} A promise at completion.
   */
  CApplet.prototype.propertySet = function(set) {
    var request = {
      method: 'POST',
      url: '/applet/' + this.header.appletId + '/propertyset',
      data: {
        set: set
      }
    }
    
    pluginClientService.sendMessage(request).then(function(response) {
      pluginClientService.refreshScope();
    });
  };

  return CApplet;
});
