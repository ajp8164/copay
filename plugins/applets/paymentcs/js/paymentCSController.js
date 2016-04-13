'use strict';

angular.module('copayApp.plugins').controller('paymentCSController', function($rootScope, $log, CContext, CWallet, CUtils, CApplet) {

  var self = this;

  this.applet = CContext.getApplet();
  this.paymentService = this.applet.getService('com.bitpay.copay.plugin.service.invoice-payment');

  // Settings
  // 
  var BITS_PER_BTC = 1e6;
  var fxBits = CUtils.getRate(CWallet.getAltCurrencyIsoCode()) / BITS_PER_BTC;
  var csRateBits = CUtils.getRate(this.applet.model.csCurrency) / BITS_PER_BTC;

  // Always in bits
  this.min = parseInt(this.applet.model.csMinimum) / csRateBits;
  this.max = parseInt(this.applet.model.csMaximum) / csRateBits;
  this.initialAmount = parseInt(this.applet.model.csInitialAmount) / csRateBits;
  this.displayAmount = this.initialAmount;
  this.currency = CWallet.getCurrencyName();

  this.init = function() {
    // Default to showing the alternative currency first.
    this.setCurrency(CWallet.getAltCurrencyIsoCode());
  };

  this.setCurrency = function(c) {
    if (c) {
      this.currency = c;
    } else {
      this.currency = (this.currency == CWallet.getCurrencyName() ? CWallet.getAltCurrencyIsoCode() : CWallet.getCurrencyName());
    }
    this.updateDisplayAmount(self.roundSlider ? self.roundSlider.getValue() : this.initialAmount);
  };

  this.updateDisplayAmount = function(amount) {
    if (this.currency == 'bits') {
      this.displayAmount = amount;
    } else if (this.currency == 'BTC') {
      this.displayAmount = amount / BITS_PER_BTC;
    } else {
      this.displayAmount = parseInt(amount * fxBits);
    }
  };

  $rootScope.$on('Local/AppletShown', function() {
    $("#round-slider").roundSlider({
      radius: 125,
      width: 30,
      handleSize: '+0',
      handleShape: 'round',
      showTooltip: false,
      sliderType: 'min-range',
      startAngle: 108,
      endAngle: 90,
      min: self.min,
      max: self.max,
      value: self.initialAmount,
      drag: function (e) {
        self.updateDisplayAmount(e.value);
        $rootScope.$apply();
      }
    });
    self.roundSlider = $("#round-slider").data("roundSlider");
  });

  // Services
  // 
  this.pay = function() {
    if (this.paymentService) {

      var amount = this.displayAmount;
      var currency = this.currency;

      // If currency is bits then convert to BTC.
      if (this.currency == 'bits') {
        currency = 'BTC';
        amount = this.displayAmount / BITS_PER_BTC;
      }

      // TODO: this.service.provider.required.buyer.fields
      var data = {
        price: amount,
        currency: currency
      };
      var memo = this.paymentService.memo;

      this.paymentService.createAndSendPayment(data, memo, function(err) {
        if (err) {
          $log.debug('ERROR with payment: '+JSON.stringify(err));
        }
      });
    }
  };

  this.init();
});
