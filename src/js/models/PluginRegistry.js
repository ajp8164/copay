'use strict';
angular.module('copayApp.model').factory('PluginRegistry', function (plugins, lodash) {

  // Constructor
  //
  function PluginRegistry() {
    throw new Error('PluginRegistry is a static class, do not instantiate this class');
  };

  // Static methods
  // 
  PluginRegistry.checkEntry = function(pluginId) {
    // Throws exception if not found.
    PluginRegistry.getEntry(pluginId);
  };

  PluginRegistry.getEntry = function(pluginId) {
    var index = lodash.findIndex(plugins, function(plugin) {
      return (plugin.pluginId == pluginId);
    });
    if (index < 0) {
      throw new Error('Could not find plugin with id \'' + pluginId + '\'');
    }
    return plugins[index];
  };

  PluginRegistry.getUIPlugins = function() {
    return lodash.filter(plugins, function(plugin) {
      return plugin.type == 'ui';
    });
  };

  PluginRegistry.getServiceProviderClass = function(pluginId) {
    return PluginRegistry.getEntry(pluginId).serviceClass;
  };

  return PluginRegistry;
});
