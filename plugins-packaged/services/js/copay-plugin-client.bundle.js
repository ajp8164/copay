'use strict';

var modules = [
	'ngLodash'
];

var copayPluginClient = angular.module('copayPluginClient', modules);

'use strict';

angular.module('copayPluginClient').factory('ApiMessage', function ($log, lodash) {

  var self;

  function ApiMessage(eventOrRequest, sequence) {
    self = this;
    self.event = {};

    // Sequence must not be provided with an event.
    if (lodash.isUndefined(sequence)) {
      var event = eventOrRequest;

      if (lodash.isUndefined(event) || !(event instanceof MessageEvent)) {
        throw Error('event is not a MessageEvent');
      }

      // Construct a message from the event data.
      self.event = event;

      // Check the itegrity of the message event.
      validateEvent();

      // Assign the event message data to this message object and make alias assignments.
      var data = JSON.parse(self.event.data);
      lodash.assign(self, data);

    } else {
      var request = eventOrRequest;

      // Construct a new message from the data and make alias assignments.
      self.header = {
        sequence: (!lodash.isUndefined(sequence) ? sequence : -1),
        id: '' + new Date().getTime(),
        timestamp: new Date()
      };
      self.request = request || {};
      self.response = {};
    }

    return self;
  };

  ApiMessage.prototype.send = function(host) {
    $log.info('[client] REQUEST  ' + self.header.sequence + ': ' + angular.toJson(transport()));
    host.postMessage(angular.toJson(transport()), '*');
  };

  ApiMessage.prototype.serialize = function() {
    return angular.toJson(transport());
  };

  function transport() {
    return {
      header: self.header,
      request: self.request,
      response: self.response
    }
  };

  function validateEvent() {
    if(lodash.isUndefined(self.event.data)) {

      // Invalid event.
      self.response = {
        statusCode: 500,
        statusText: 'Invalid message event, no \'data\' found.',
        data: {}
      };
      throw new Error();

    } else if (!lodash.isString(self.event.data)) {

      // Event data not a string.
      self.response = {
        statusCode: 500,
        statusText: 'Invalid message event data, expected string argument but received object.',
        data: {}
      };
      throw new Error();
    }
  };

  return ApiMessage;
});

'use strict';

angular.module('copayPluginClient').service('pluginClientService', function ($log, $rootScope, $injector, $timeout, lodash, ApiMessage, CError) {

  var root = {};
  var host = window.parent;
  var REQUEST_TIMEOUT = 3000; // milliseconds

  var START_URL = '/start';
  var SCOPE_URL = '/scope';

  var clientServiceState = {
    statusCode: -1,
    statusText: ''
  };

  var sequence = 0;
  var promises = [];

  root.sendMessage = function(request) {
    return new Promise(function(resolve, reject) {

      var onComplete = function(message) {
        if (message.response.statusCode >= 200 &&
          message.response.statusCode <= 299) {

          if (!lodash.isUndefined(message.request.responseObj)) {
            // Create an instance of the promised responseObj with the message data.
            var responseObj = $injector.get(message.request.responseObj);
            responseObj = eval(new responseObj(message.response.data.obj));
          } else {
            // Send the plain response object data if no responseObj set.
            // The receiver will have to know how to interpret the object.
            responseObj = message.response;
          }

          resolve(responseObj);

        } else {

          var responseObj = new CError(message);
          reject(responseObj);
        }
      };

      // Create a new request message.
      var message = new ApiMessage(request, sequence++);

      // Send the message only if the client is OK or if the purpose of the message is to
      // start the client.
      if (clientServiceIsOK() || isStartMessage(message)) {

        // Set a communication timeout timer.
        var timeoutTimer = $timeout(function() {
          timeout(message);
        }, REQUEST_TIMEOUT);

        // Store the promise callback for execution when a message is received.
        promises.push({
          id: message.header.id,
          onComplete: onComplete,
          timer: timeoutTimer
        });

        message.send(host);

      } else {

        // The client service is not ready. Short circuit the communication and immediatley respond.
        message.response = {
          statusCode: 503,
          statusText: 'Client service is not ready.',
          data: {}
        };
        onComplete(message);

      }
    });
  };

  function init() {
    window.addEventListener('message', receiveMessage.bind(this));
    start();
    return this;
  };

  function start() {
    var request = {
     method: 'POST',
     url: START_URL,
     data: {}
    }

    root.sendMessage(request).then(function(response) {
      $log.info('[client] START: ' + response.statusText + ' (' + response.statusCode + ')');

      clientServiceState = {
        statusCode: 200,
        statusText: response.statusText
      };

      root.refreshScope(function(error) {
        $rootScope.$emit('Client/Start', error);
      });

    }, function(error) {
      $log.error('[client] START ERROR: ' + error.message + ' (' + error.statusCode + ')');

      clientServiceState = {
        statusCode: error.statusCode,
        statusText: error.message
      };
      $rootScope.$emit('Client/Start', error);

    });
  };

  root.refreshScope = function(callback) {
    var request = {
     method: 'GET',
     url: SCOPE_URL
    }

    root.sendMessage(request).then(function(response) {
      $log.info('[client] SCOPE: ' + response.statusText + ' (' + response.statusCode + ')');

      // Apply the response to the clients root scope.
      $rootScope.env = response.data.env;
      $rootScope.applet = response.data.applet;

      $timeout(function() {
        $rootScope.$apply();
      });

      if (callback) {
        callback();
      }
      
    }, function(error) {
      $log.error('[client] SCOPE ERROR: ' + error.message + ' (' + error.statusCode + ')');
      callback(error);
    });
  };

  function clientServiceIsOK() {
    return clientServiceState.statusCode >= 200 && clientServiceState.statusCode <= 299;
  };

  function isStartMessage(message) {
    return message.request.url == START_URL;
  };

  function receiveMessage(event) {
    var message;

    try {
      message = new ApiMessage(event);

      // $log.info('[client] receive  ' + message.header.sequence + ': ' + message.serialize() + ' (from ' + message.event.source.location.toString() + ')');

      var promiseIndex = lodash.findIndex(promises, function(promise) {
        return promise.id == message.header.id;
      });

      if (promiseIndex >= 0) {
        // Remove the promise from the list.
        // Cancel the timeout timer.
        // Deliver the response to the client.
        var promise = lodash.pullAt(promises, promiseIndex);
        $timeout.cancel(promise[0].timer);
        promise[0].onComplete(message);

      } else {
        $log.debug('Message received but there is no promise to fulfill: ' + message.serialize());
      }      

    } catch (ex) {

      // Not possible to notify client since the message is invalid.
      // The client will timeout if a valid response is not received.
      $log.error('[client] ERROR: invalid message received, ' + ex.message + ' - '+ angular.toJson(event));
    }
  };

  function timeout(message) {
    $log.debug('Applet client request timeout: ' + message);

    var promiseIndex = lodash.findIndex(promises, function(promise) {
      return promise.id == message.header.id;
    });

    if (promiseIndex >= 0) {
      var promise = lodash.pullAt(promises, promiseIndex);

      message.response = {
        statusCode: 408,
        statusText: 'Request timed out.',
        data: {}
      }
      promise[0].onComplete(message);
    } else {
      $log.debug('Message request timed out but there is no promise to fulfill: ' + message.serialize());
    }
  };

  init();

  return root;
});

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

'use strict';

angular.module('copayPluginClient').factory('CBitPayInvoicePaymentService', function (pluginClientService) {

  /**
   * Service identification
   * { 
   *   "pluginId": "com.bitpay.copay.plugin.service.invoice-payment",
   *   "memo": "American Red Cross donation.",
   *   "api": {
   *     "url": "https://test.bitpay.com",
   *     "auth": {
   *       "token": "F3mNhfiGT3TCBcBFp6egxzPVjxtDPNMjKA3ru9TdFqaX"
   *     },
   *     "transactionSpeed": "high",
   *     "notificationEmail": "",
   *     "notificationURL": ""
   *   },
   *   "required": {
   *     "buyer": {
   *       "fields": "name,email,phone,address1,locality,region,postalCode"
   *     }
   *   }
   * }
   */
  var pluginId = 'com.bitpay.copay.plugin.service.invoice-payment';
  var serviceDescProperties = [
    '.pluginId',
    '.memo',
    '.api',
    '.api.url',
    '.api.auth',
    '.api.auth.token',
    '.api.transactionSpeed',
    '.api.notificationEmail',
    '.api.notificationURL',
    '.required',
    '.required.buyer',
    '.required.buyer.fields',
  ];

  var paymentRequest = null;

  /**
   * Sample invoice reponse
   * {
   *   "facade":"pos/invoice",
   *   "data":{
   *     "url":"https://bitpay.com/invoice?id=DNN1kKv76MMH1jpDJZpcgH",
   *     "status":"new",
   *     "btcPrice":"0.228969",
   *     "btcDue":"0.228969",
   *     "price":100,
   *     "currency":"USD",
   *     "exRates":{
   *       "USD":436.74
   *     },
   *     "invoiceTime":1450723391747,
   *     "expirationTime":1450724291747,
   *     "currentTime":1450723391896,
   *     "guid":"1450723391611",
   *     "id":"DNN1kKv76MMH1jpDJZpcgH",
   *     "btcPaid":"0.000000",
   *     "rate":436.74,
   *     "exceptionStatus":false,
   *     "paymentUrls":{
   *       "BIP21":"bitcoin:1JQjMP4QM9WP2zXa9qPbaPZ9sfTcqVXTvA?amount=0.228969",
   *       "BIP72":"bitcoin:1JQjMP4QM9WP2zXa9qPbaPZ9sfTcqVXTvA?amount=0.228969&r=https://bitpay.com/i/DNN1kKv76MMH1jpDJZpcgH",
   *       "BIP72b":"bitcoin:?r=https://bitpay.com/i/DNN1kKv76MMH1jpDJZpcgH",
   *       "BIP73":"https://bitpay.com/i/DNN1kKv76MMH1jpDJZpcgH"
   *     },
   *     "token":"2N4ZLhiqcncAT8met5SVxLPfrZGAc92RaECR6PSFikdjvMw8jCGKSvHc1ByWYtzWLm"
   *   }
   * }
   */

  /**
   * Constructor.
   * @param {Object} serviceDesc - A service description object originating from a skin.
   * @constructor
   */
  function CBitPayInvoicePaymentService(serviceDesc) {
  };

  CBitPayInvoicePaymentService.prototype = new AbstractPaymentService();

  /**
   * Return the recently created payment request.
   * @return {Object} A payment request.
   */
  CBitPayInvoicePaymentService.prototype.getPaymentRequest = function() {
    return self.paymentRequest;
  };

  /**
   * Callback for createPaymentRequest().
   * @callback {createPaymentRequestCallback}
   * @param {String|undefined} error - An error message or undefined.
   */

  /**
   * Create a new payment request.
   * @param {Object} data - Payment request data.
   * @param {createPaymentRequestCallback} callback - A callback on completion.
   * @return {Object} This object.
   */
  CBitPayInvoicePaymentService.prototype.createPaymentRequest = function(data, callback) {
    var postData = {
      // Required parameters
      token: self.api.auth.token,
      guid: self.guid(),
      price: data.price,
      currency: data.currency,
      // Optional parameters
      orderId: data.orderId,
      itemDesc: data.itemDesc,
      itemCode: data.itemCode,
      posData: data.posData,
      physical: data.physical,
      buyer: {
        name: data.name,
        address1: data.address1,
        address2: data.address2,
        locality: data.locality,
        region: data.region,
        postalCode: data.postalCode,
        country: data.country,
        email: data.email,
        phone: data.phone,
        notify: data.notify
      },
      transactionSpeed: self.api.transactionSpeed,
      notificationEmail: self.api.notificationEmail,
      notificationURL: self.api.notificationURL
    };

    $rootScope.$emit('Local/PaymentServiceStatus', gettext('Fetching payment instructions'));
    
    self.post('/invoices', postData, function(err, response) {
      $rootScope.$emit('Local/PaymentServiceStatus');
      if (err) {
        return callback(err);
      }
      $log.debug('Invoice created: ' + JSON.stringify(response.data));
      self.paymentRequest = response.data;
      callback();
    });
    return self;
  };

  /**
   * Callback for sendPayment().
   * @callback {sendPaymentCallback}
   * @param {String|undefined} error - An error message or undefined.
   */

  /**
   * Create a new payment request.
   * @param {String} memo - A description for the payment.
   * @param {sendPaymentCallback} callback - A callback on completion.
   */
  CBitPayInvoicePaymentService.prototype.sendPayment = function(memo, callback) {
    $rootScope.$emit('Local/PaymentServiceStatus', gettext('Sending payment'));
    AbstractPaymentService.sendPayment({
      payProUrl: self.paymentRequest.data.paymentUrls.BIP73,
      memo: memo
    }, function(err) {
      $rootScope.$emit('Local/PaymentServiceStatus');
      callback(err);
    });
  };

  /**
   * Callback for createAndSendPayment().
   * @callback {createAndSendPaymentCallback}
   * @param {String|undefined} error - An error message or undefined.
   */

  /**
   * Convenience method for creating the payment request and sending it in one operation..
   * @param {Object} data - Payment request data.
   * @param {String} memo - A description for the payment.
   * @param {createAndSendPaymentCallback} callback - A callback on completion.
   */
  CBitPayInvoicePaymentService.prototype.createAndSendPayment = function(data, memo, callback) {
    self.createPaymentRequest(data, function(err, response) {
      if (err) {
        return callback(err);
      }
      self.sendPayment(memo, function(err) {
        return callback(err);
      });
    });
  };
 
  return CBitPayInvoicePaymentService;
});

'use strict';
angular.module('copayPluginClient').factory('CConst', function () {

  /**
   * Constructor.
   * @return {CConst} An instance of CConst.
   * @constructor
   */
  function CConst() {
    return this;
  };

  CConst.BITS_PER_BTC = 1e6;
  CConst.SATOSHI_PER_BTC = 1e8;

  return CConst;
});

'use strict';
angular.module('copayPluginClient').factory('CContext', function (pluginClientService) {

  /**
   * Constructor.
   * @return {CContext} An instance of CContext.
   * @constructor
   */
  function CContext() {
    return this;
  };

  function sessionId() {
    var sessionId = window.location.search.substring(window.location.search.indexOf('sessionId=') + 10);
    if (sessionId.indexOf('&') >= 0) {
      sessionId = sessionId.substring(0, sessionId.indexOf('&'));
    }
    return sessionId;
  };

  /**
   * Return the applet session.
   * @return {Promise<CSession>} A promise to the session.
   * @static
   */
  CContext.getSession = function() {
    var request = {
     method: 'GET',
     url: '/session/' + sessionId(),
     responseObj: 'CSession'
    }
    return pluginClientService.sendMessage(request);
  };

  return CContext;
});

'use strict';

angular.module('copayPluginClient').factory('CError', function (lodash) {

  /**
   * Constructor.
   * @return {CError} An instance of CError.
   * @constructor
   */
  function CError(message) {
    lodash.assign(this, message);

    this.statusCode = this.response.statusCode;
    this.message = this.response.statusText;

    return this;
  };

  return CError;
});

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

'use strict';

angular.module('copayPluginClient').factory('CSession', function (lodash, pluginClientService, CApplet) {

  var _session;

  /**
   * Constructor.  An instance of this class must be obtained from CContext.
   * @param {AppletSession} session - An internal Session object.
   * @return {Object} An instance of CSession.
   * @constructor
   */
  function CSession(appletSession) {
    lodash.assign(this, appletSession);
    _session = appletSession;
    return this;
  };

  /**
   * Write all session data to persistent storage.
   * @return {Promise} A promise at completion.
   */
  CSession.prototype.flush = function() {
    var request = {
     method: 'POST',
     url: '/session/flush'
    }
    return pluginClientService.sendMessage(request);
  };

  /**
   * Retrieve session data by name.
   * @param {String} name - User specified data name defined using set(name, value).
   * @return {Promise<Object>} A promise for stored value.
   */
  CSession.prototype.get = function(name) {
    var request = {
     method: 'GET',
     url: '/session/' + this.id + '/var/' + name
    }
    return pluginClientService.sendMessage(request);
  };

  /**
   * Return the applet for this session.
   * @return {Promise<CApplet>} A promise for the applet.
   */
  CSession.prototype.getApplet = function () {
    var request = {
      method: 'GET',
      url: '/session/' + this.id + '/applet',
      responseObj: 'CApplet'
    }
    return pluginClientService.sendMessage(request);
  };

  /**
   * Restore all session data from persistent storage.
   * @return {Promise} A promise at completion.
   */
  CSession.prototype.restore = function() {
    var request = {
      method: 'POST',
      url: '/session/' + this.id + '/restore',
      data: {}
    }

    pluginClientService.sendMessage(request);
  };

  /**
   * Set session data by name.
   * @param {String} name - Location to store the specified value.
   * @param {Object} value - The data value to store.
   * @param {Boolean} [publish] - Publish the specified session data to the view scope as 'applet.session.<name>'.
   * @return {Promise} A promise at completion.
   */
  CSession.prototype.set = function(name, value, publish) {
    var request = {
      method: 'POST',
      url: '/session/' + this.id + '/var/' + name + (publish ? '/publish' : ''),
      data: {
        value: value
      }
    }

    pluginClientService.sendMessage(request).then(function(response) {
      if (publish) {
        pluginClientService.refreshScope();
      }
    });
  };

  return CSession;
});

'use strict';

angular.module('copayPluginClient').factory('CSystem', function () {

  /**
   * Constructor.
   * @return {CSystem} An instance of CSystem.
   * @constructor
   */
  function CSystem() {
    return this;
  };

  /**
   * Return whether or not the specified object has all required properties.
   * @return {Object} An object of two arrays; 'missing' and 'other' properties.
   * @static
   */
  CSystem.checkObject = function(obj, requiredProperties) {
    var properties = iterateObj(obj, '');

    var missing = [];
    var other = [];
    for (var i = 0; i < requiredProperties.length; i++) {
      if (properties.indexOf(requiredProperties[i]) < 0) {
        missing.push(requiredProperties[i]);
      }
    }
    for (var i = 0; i < properties.length; i++) {
      if (requiredProperties.indexOf(properties[i]) < 0) {
        other.push(properties[i]);
      }
    }
    return { missing: missing, other: other };
  };

  // Recursively iterate over the objects properties and return an array of properties.
  function iterateObj(obj, stack) {
    var properties = [];
    for (var property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] == "object") {
          properties.push(stack + '.' + property);
          properties = properties.concat(iterateObj(obj[property], stack + '.' + property));
        } else {
          properties.push(stack + '.' + property);
        }
      }
    }
    return properties;
  };

  return CSystem;
});

'use strict';

angular.module('copayPluginClient').factory('CUtils', function (rateService) {

  /**
   * Constructor.
   * @return {CUtils} An instance of CUtils.
   * @constructor
   */
  function CUtils() {
    return this;
  };

  /**
   * Retrieve a currency exchange rate (vs. bitcoin price).
   * @param {String} code - The ISO currency code for exchange.
   * @return {Object} An instance of a service object.
   * @static
   */
  CUtils.getRate = function(isoCode) {
    return rateService.getRate(isoCode);
  };

  return CUtils;
});

'use strict';

angular.module('copayPluginClient').factory('CWallet', function (configService, txFormatService, FocusedWallet) {

  /**
   * Constructor.
   * @return {Object} An instance of CWallet.
   * @constructor
   */
  function CWallet() {
    return this;
  };

  /**
   * Return the current wallet currency unit name.
   * @return {String} A currency unit name.
   * @static
   */
  CWallet.getCurrencyName = function() {
    return configService.getSync().wallet.settings.unitName;
  };

  /**
   * Return the current wallet currency code.
   * @return {String} A currency code.
   * @static
   */
  CWallet.getCurrencyCode = function() {
    return configService.getSync().wallet.settings.unitCode;
  };

  /**
   * Return the current wallet alternative currency unit name.
   * @return {String} A currency name.
   * @static
   */
  CWallet.getAltCurrencyName = function() {
    return configService.getSync().wallet.settings.alternativeName;
  };

  /**
   * Return the current wallet alternative currency unit ISO code.
   * @return {String} An ISO code.
   * @static
   */
  CWallet.getAltCurrencyIsoCode = function() {
    return configService.getSync().wallet.settings.alternativeIsoCode;
  };

  /**
   * Return the current wallet conversion for unit to satoshi.
   * @return {Number} A unit to satoshi conversion number.
   * @static
   */
  CWallet.getUnitToSatoshi = function() {
    return configService.getSync().wallet.settings.unitToSatoshi;
  };

  /**
   * Return the current wallet unit number of decimal places.
   * @return {Number} A number of decimal places.
   * @static
   */
  CWallet.getUnitDecimals = function() {
    return configService.getSync().wallet.settings.unitDecimals;
  };

  /**
   * Return the formatted amount for display using the current wallet settings.
   * @return {String} A formatted currency amount.
   * @static
   */
  CWallet.formatAmount = function(amount) {
    return txFormatService.formatAmount(amount);
  };

  /**
   * Callback for sendPayment().
   * @callback {sendPaymentCallback}
   * @param {String|undefined} error - An error message or undefined.
   */

  /**
   * Sends a bitcoin payment from the current wallet.
   * This method presents a user interface confirmation prior to sending payment.
   *
   * {payproData} - For payment-protocol payments provide the following payment data object.
   * 
   * data: {
   *   {String} payProUrl - The full payment protocol service URL.
   *   {String} memo - A human readbale memo attached to the payment.
   * }
   * 
   * {paymentData} - For all other payments provide the following payment data object.
   *   
   * data: {
   *   {String} toAddress - A bitcoin destination address.
   *   {Number} amount - The number of satoshi's to send.
   *   {String} memo - A human readbale memo attached to the payment.
   * }
   *
   * @param {payproData|paymentData} data - The payment data.
   * @param {sendPaymentCallback} callback - A callback on completion.
   * @static
   */
  CWallet.sendPayment = function(data, callback) {
    var wallet = FocusedWallet.getInstance();
    return wallet.sendPayment(data, callback);
  };

  return CWallet;
});
