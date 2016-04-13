'use strict';

angular.module('copayApp.plugins').factory('BitPayInvoicePaymentService', function (AbstractPaymentService, $rootScope, $log, gettext, CPlugin) {

  // Service identification
  // 
  var id = 'com.bitpay.copay.plugin.service.invoice-payment';

  // Private properties
  //
  var self = null;
  var paymentRequest = null;

  // Sample invoice reponse
  // {
  //   "facade":"pos/invoice",
  //   "data":{
  //     "url":"https://bitpay.com/invoice?id=DNN1kKv76MMH1jpDJZpcgH",
  //     "status":"new",
  //     "btcPrice":"0.228969",
  //     "btcDue":"0.228969",
  //     "price":100,
  //     "currency":"USD",
  //     "exRates":{
  //       "USD":436.74
  //     },
  //     "invoiceTime":1450723391747,
  //     "expirationTime":1450724291747,
  //     "currentTime":1450723391896,
  //     "guid":"1450723391611",
  //     "id":"DNN1kKv76MMH1jpDJZpcgH",
  //     "btcPaid":"0.000000",
  //     "rate":436.74,
  //     "exceptionStatus":false,
  //     "paymentUrls":{
  //       "BIP21":"bitcoin:1JQjMP4QM9WP2zXa9qPbaPZ9sfTcqVXTvA?amount=0.228969",
  //       "BIP72":"bitcoin:1JQjMP4QM9WP2zXa9qPbaPZ9sfTcqVXTvA?amount=0.228969&r=https://bitpay.com/i/DNN1kKv76MMH1jpDJZpcgH",
  //       "BIP72b":"bitcoin:?r=https://bitpay.com/i/DNN1kKv76MMH1jpDJZpcgH",
  //       "BIP73":"https://bitpay.com/i/DNN1kKv76MMH1jpDJZpcgH"
  //     },
  //     "token":"2N4ZLhiqcncAT8met5SVxLPfrZGAc92RaECR6PSFikdjvMw8jCGKSvHc1ByWYtzWLm"
  //   }
  // }

  // Constructor
  // 
  function BitPayInvoicePaymentService(obj) {
    self = this;
    for (var property in obj) {
      if (obj.hasOwnProperty(property)) {
        self[property] = obj[property];
      }
    }
    var my = CPlugin.getRegistryEntry(id);
    self.providerName = my.name;
    self.providerDescription = my.description;
  };

  BitPayInvoicePaymentService.prototype = new AbstractPaymentService();

  // Public methods
  // 
  BitPayInvoicePaymentService.prototype.getPaymentRequest = function() {
    return self.paymentRequest;
  };

  BitPayInvoicePaymentService.prototype.createPaymentRequest = function(data, cb) {
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
        return cb(err);
      }
      $log.debug('Invoice created: ' + JSON.stringify(response.data));
      self.paymentRequest = response.data;
      cb();
    });
    return self;
  };

  BitPayInvoicePaymentService.prototype.sendPayment = function(memo, cb) {
    $rootScope.$emit('Local/PaymentServiceStatus', gettext('Sending payment'));
    AbstractPaymentService.sendPayment({
      payProUrl: self.paymentRequest.data.paymentUrls.BIP73,
      memo: memo
    }, function(err) {
      $rootScope.$emit('Local/PaymentServiceStatus');
      cb(err);
    });
  };

  // Convenience method for creating the payment request and sending it in one operation.
  // 
  BitPayInvoicePaymentService.prototype.createAndSendPayment = function(data, memo, cb) {
    self.createPaymentRequest(data, function(err, response) {
      if (err) {
        return cb(err);
      }
      self.sendPayment(memo, function(err) {
        return cb(err);
      });
    });
  };

  // TODO
  BitPayInvoicePaymentService.prototype.setNotification = function() {
    // Setup a reminder notification service to send app notification when a payment is upcoming.
    // 
    //  occurance: once,
    //
    //  occurance: daily,
    //  time: 0900
    //
    //  occurance: monthly,
    //  day: 21
    //
    //  occurance: weekly,
    //  time: 0900
    //
    //  occurance: quarterly,
    //  day: 1
    //
    //  occurance: yearly,
    //  month: 1
    //  day: 1
    //  
    return;
  };

  return BitPayInvoicePaymentService;
});
