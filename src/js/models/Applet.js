'use strict';
angular.module('copayApp.model').factory('Applet', function ($rootScope, $log, $injector, $css, lodash, PluginRegistry) {

  var self = this;
  var _publishedKeys = [];

  // Reserved applet properties should not be overwritten by the applet plugin.
  Applet.reservedProperties = [
    'header',
    'model',
    'view',
    'path'
  ];

  // Constructor (See https://medium.com/opinionated-angularjs/angular-model-objects-with-javascript-classes-2e6a067c73bc#.970bxmciz)
  // 
  function Applet(obj, skin) {
    lodash.assign(this, obj);
    this.skin = skin;
    return this;
  };

  // Private methods
  //
  function isReservedProperty(key) {
    return Applet.reservedProperties.includes(key);
  };

  function publishAppletProperties(applet) {
    $rootScope.applet.header = applet.header;
    $rootScope.applet.model = applet.model;
    $rootScope.applet.view = applet.view;
    $rootScope.applet.path = PluginRegistry.getEntry(applet.header.pluginId).path;
    $rootScope.applet.title = applet.header.name;
  };

  // Public methods
  //
  Applet.prototype.initEnvironment = function() {
    publishAppletProperties(this);

    // Bind stylesheet(s) for this applet.
    var stylesheets = PluginRegistry.getEntry(this.header.pluginId).stylesheets;
    stylesheets.forEach(function(stylesheet) {
      $css.bind({ 
        href: stylesheet
      }, $rootScope);
    });
  };

  Applet.prototype.mainViewUrl = function() {
    return PluginRegistry.getEntry(this.header.pluginId).mainViewUri;
  };

  Applet.prototype.property = function(key, value) {    
    if (!isReservedProperty(key) && value) {
      $rootScope.applet[key] = value;
      if (!_publishedKeys.includes(key)) {
        _publishedKeys.push(key);
      }
    }
    return $rootScope.applet[key];
  };

  Applet.prototype.getService = function(pluginId) {
    var serviceIndex = lodash.findIndex(this.services, function(service) {
      return service.pluginId == pluginId;
    });

    if (serviceIndex < 0) {
      throw new Error('Configuration for skin \'' + this.skin.header.name + '\' is missing required configuration for service plugin id \'' + pluginId + '\'');
    }

    // Find the plugin specified service class in the registry, use $injector to get the factory object,
    // and create a new service instance.  Using the $injector here allows this class (factory) from having
    // to declare dependencies on dynamically defined (plugin) service classes (factory's).
    var serviceApi = PluginRegistry.getServiceApi(pluginId);
    var service = $injector.get(serviceApi);
    return eval(new service(this.services[serviceIndex]));
  };

  Applet.prototype.open = function() {
    // Invoke rootScope published function to avoid dependency on appletService.
    $rootScope.applet.open(this);
  };

  Applet.prototype.close = function() {
    // Invoke rootScope published function to avoid dependency on appletService.
    $rootScope.applet.close();
  };

  Applet.prototype.finalize = function(callback) {
    // Remove applet stylesheets.
    $css.removeAll();

    // Delete published properties.
    for (var i = 0; i < _publishedKeys.length; i++) {
      delete $rootScope.applet[_publishedKeys[i]];
    }
    callback();
  };

  return Applet;
});
