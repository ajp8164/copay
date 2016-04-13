'use strict';
angular.module('copayApp.model').factory('Applet', function ($rootScope, $log, $injector, lodash, PluginRegistry) {

  // Constructor (See https://medium.com/opinionated-angularjs/angular-model-objects-with-javascript-classes-2e6a067c73bc#.970bxmciz)
  // 
  function Applet(obj, skin) {
    lodash.assign(this, obj);
    this.skin = skin;
    return this;
  };

  // Public methods
  //
  Applet.prototype.path = function(uri) {
    return PluginRegistry.getEntry(this.header.pluginId).path + uri;
  };

  Applet.prototype.stylesheets = function() {
    return PluginRegistry.getEntry(this.header.pluginId).stylesheets;
  };

  Applet.prototype.mainViewUrl = function() {
    return PluginRegistry.getEntry(this.header.pluginId).mainViewUri;
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
    var serviceClass = PluginRegistry.getServiceProviderClass(pluginId);
    var service = $injector.get(serviceClass);
    return eval(new service(this.services[serviceIndex]));
  };

  Applet.prototype.open = function() {
    // Invoke rootScope published function to avoid dependency on appletService.
    $rootScope.applet.open(this);
  };

  Applet.prototype.close = function() {
    // Invoke rootScope published function to avoid dependency on appletService.
    $rootScope.applet.close(this);
  };
    
  return Applet;
});
