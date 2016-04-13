'use strict';
angular.module('copayApp.api').factory('CPlugin', function (PluginRegistry) {

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
   *   serviceClass: String - The class name of the plugin (used to create an instance of the plugin).
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

  return CPlugin;
});
