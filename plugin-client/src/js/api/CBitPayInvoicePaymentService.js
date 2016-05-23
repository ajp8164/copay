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
