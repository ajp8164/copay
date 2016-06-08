'use strict';
angular.module('copayApp.services').factory('posPaymentService', function($rootScope) {

    var root = {};

    // Handle a POS payment notification (a push service request).
    root.handlePaymentNotice = function(data) {
      // Simplest way to get the payment uri into send form.
      // 
      // data.additionalData.paymentUri is a BIP73 payment URI
      // Example: https://bitpay.com/i/Eq46exwzTfDd1kaUdWqgL7
      // 
      // iOS data payload example for Node Push Server:
      /*
        {
           "badge": 1,
           "alert": {
             "title": "Payment Request",
             "body": "Amazon checkout for $542.17",
             "action-loc-key": "Pay"
           },
           "sound": "soundName",
           "payload": {
             "posPayment": true,
             "paymentUri": "https://bitpay.com/i/Eq46exwzTfDd1kaUdWqgL7"
           }
         }
      */
      // 
      $rootScope.$emit('dataScanned', data.additionalData.paymentUri);
    };

    return root;
  });
