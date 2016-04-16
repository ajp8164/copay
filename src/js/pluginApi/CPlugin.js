'use strict';
angular.module('copayApp.api').factory('CPlugin', function ($log, CSystem, PluginRegistry) {

  /**
   * {PluginObject}
   * 
   * Plugins are registered during the application build process.  Each plugin is represented
   * as a plugin registry entry and defines properties as follows.
   *
   *  Properties shared by all plugins.
   *  
   *   type: String - The type of plugin, 'applet' or 'service'.
   *   pluginId: String - The unique plugin identifier.
   *   name: String - Human readable name of the plugin.
   *   description: String - A short description of the plugin.
   *   author: String - The author of the plugin.
   *   date: String - The date the plugin is made available (typ. 'mm/dd/yyyy').
   *   version: String - A version identfier for the plugin (typ. 'x.y.z').
   *
   * Applet specific plugin properties.
   * 
   *   mainViewUri: String - The relative path to the applet main view.
   *   path: String - The relative path to the applet root location.
   *   stylesheets: Array of String - A list of style sheets to apply when the applet is opened.
   *
   * Service specific plugin properties.
   * 
   *   serviceApi: String - The class name of the plugin API (used to create an instance of the plugin).
   */

  /**
   * Constructor.
   * @return {Object} An instance of CPlugin.
   * @constructor
   */
  function CPlugin() {
    return this;
  };

  /**
   * Return the plugin registry entry for the specified plugin id.
   * @param {String} pluginId - The plugin id that identifies a registered plugin.
   * @return {PluginObject} An instance of a plugin object.
   * @throws Will throw an error if no plugin registry was found.
   * @static
   */
  CPlugin.getRegistryEntry = function(pluginId) {
    return PluginRegistry.getEntry(pluginId);
  };

  /**
   * Validate that the specified service description object contains all required properties.
   * @param {String} serviceDesc - A service description object specified in a skin.
   * @param {Array} requiredProperties - An array of required properties; e.g., ['.a','.b','.b.c'].
   * @param {String} pluginId - The plugin id of the requestor.
   * @throws Will throw an error if serviceDesc is missing any required properties.
   * @static
   */
  CPlugin.validateServiceDesc = function(serviceDesc, requiredProperties, pluginId) {
    var result = CSystem.checkObject(serviceDesc, requiredProperties);
    if (result.missing.length > 0) {
      throw new Error('Error: A skin with service plugin \'' + pluginId + '\' is missing required properties \'' + result.missing.toString() + '\'');
    }
    if (result.other.length > 0) {
      $log.warn('Warning: A skin with service plugin \'' + pluginId + '\' has unrecognized properties \'' + result.other.toString() + '\'');
    }
  };

  return CPlugin;
});
