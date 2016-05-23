'use strict';

angular.module('copayPluginClient').factory('CPlugin', function ($log, CSystem, PluginRegistry) {

  /**
   * PluginObject.
   * -------------
   * 
   * Plugins are registered during the application build process.  Each plugin is represented
   * as a plugin registry entry and defines properties as follows.
   *
   * Properties shared by all plugins.
   *
   *   {String} type - The type of plugin, 'applet' or 'service'.
   *   {String} pluginId - The unique plugin identifier.
   *   {String} name - Human readable name of the plugin.
   *   {String} description - A short description of the plugin.
   *   {String} author - The author of the plugin.
   *   {String} date - The date the plugin is made available (typ. 'mm/dd/yyyy').
   *   {String} version - A version identfier for the plugin (typ. 'x.y.z').
   * 
   * Applet specific plugin properties.
   * 
   *   {String} mainViewUri - The relative path to the applet main view.
   *   {String} path - The relative path to the applet root location.
   *   {Array of String} stylesheets - A list of style sheets to apply when the applet is opened.
   *
   * Service specific plugin properties.
   * 
   *   {String} serviceApi - The class name of the plugin API (use to create an instance of the plugin).
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
//    return PluginRegistry.getEntry(pluginId);
    var request = {
     method: 'GET',
     url: '/plugin-registry?id=' + pluginId
    }
    return pluginClientService.sendMessage(request);

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
