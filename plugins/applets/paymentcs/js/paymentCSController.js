'use strict';

angular.module('copayApp.plugins').controller('paymentCSController', function($rootScope, $scope, $log, lodash, CContext, CWallet, CUtils) {

  var self = this;

  var BITS_PER_BTC = 1e6;
  var SESSION_KEY_PREFS = 'preferences';

  var _session;
  var _applet;
  var _paymentService;
  var _prefs;
  var _fxBits;
  var _csRateBits;

  $rootScope.$on('Local/AppletLeave', function(event) {
    // Save preferences before close.
    _session.set(SESSION_KEY_PREFS, _prefs);
  });

  this.init = function(sessionId) {
    _session = CContext.getSession(sessionId);
    _applet = _session.getApplet();
    _paymentService = _applet.getService('com.bitpay.copay.plugin.service.invoice-payment');

    _fxBits = CUtils.getRate(CWallet.getAltCurrencyIsoCode()) / BITS_PER_BTC;
    _csRateBits = CUtils.getRate(_applet.model.csCurrency) / BITS_PER_BTC;

    // All values in bits.
    this.min = parseInt(_applet.model.csMinimum) / _csRateBits;
    this.max = parseInt(_applet.model.csMaximum) / _csRateBits;
    this.initialAmount = parseInt(_applet.model.csInitialAmount) / _csRateBits;
    this.displayAmount = this.initialAmount;
    this.currency = CWallet.getCurrencyName();

    this.applyPreferences();
  };

  this.applyPreferences = function() {
    // Read and apply applet prefrences.
    _prefs = _session.get(SESSION_KEY_PREFS) || {};

    // Set currency display.
    _prefs.currencyDisplayAlt = (lodash.isUndefined(_prefs.currencyDisplayAlt) ? true : _prefs.currencyDisplayAlt);
    if (_prefs.currencyDisplayAlt) {
      this.setCurrency(CWallet.getAltCurrencyIsoCode());
    } else {
      this.setCurrency(CWallet.getCurrencyName());
    }
  };

  this.setCurrency = function(c) {
    if (c) {
      this.currency = c;
    } else {
      this.currency = (this.currency == CWallet.getCurrencyName() ? CWallet.getAltCurrencyIsoCode() : CWallet.getCurrencyName());
    }
    this.updateDisplayAmount(self.roundSlider ? self.roundSlider.getValue() : this.initialAmount);

    // Update the preference setting.
    _prefs.currencyDisplayAlt = (this.currency == CWallet.getAltCurrencyIsoCode());
  };

  this.updateDisplayAmount = function(amount) {
    if (this.currency == 'bits') {
      this.displayAmount = parseInt(amount);
    } else if (this.currency == 'BTC') {
      this.displayAmount = amount / BITS_PER_BTC;
    } else {
      this.displayAmount = parseInt(amount * _fxBits);
    }
  };

  $rootScope.$on('Local/AppletShown', function(event, applet, wealletId) {
    $('#round-slider').roundSlider({
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
    self.roundSlider = $('#round-slider').data('roundSlider');
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

});
