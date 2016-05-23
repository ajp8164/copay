'use strict';

angular.module('paymentCSApp.controllers').controller('paymentCSController', function($rootScope, $scope, $log, lodash, CContext) { //CWallet, CUtils, CConst

  var self = this;

  var SESSION_KEY_PREFS = 'preferences';

  var _session;
  var _applet;
  var _paymentService;
  var _prefs;
  var _fxBits;
  var _csRateBits;

  // Listen for the client service to complete startup.
  $rootScope.$on('Client/Start', function(event, error) {
    if (error) {
      $log.debug("Client startup error: " + error.message + ' (' + error.statusCode + ')');
    } else {
      self.init();
    }
  });

  $rootScope.$on('Local/AppletLeave', function(event) {
    // Save preferences before close.
    _session.set(SESSION_KEY_PREFS, _prefs);
  });

  this.init = function(sessionId) {
    CContext.getSession().then(function(session) {

      _session = session;
      return _session.getApplet();

    }).catch(function(error) {

      $log.debug("Failed to get session: " + error.message + ' (' + error.statusCode + ')');
      throw error;

    }).then(function(applet) {

      _applet = applet;
      _applet.initService('com.bitpay.copay.plugin.service.invoice-payment');

    }).catch(function(error) {
      $log.debug("Failed to initialize: " + error.message + ' (' + error.statusCode + ')');
    });

/////////
/////////
/////////

/*
    _fxBits = CUtils.getRate(CWallet.getAltCurrencyIsoCode()) / CConst.BITS_PER_BTC;
    _csRateBits = CUtils.getRate(_applet.model.csCurrency) / CConst.BITS_PER_BTC;

    // All values in bits.
    this.min = parseInt(_applet.model.csMinimum) / _csRateBits;
    this.max = parseInt(_applet.model.csMaximum) / _csRateBits;
    this.initialAmount = parseInt(_applet.model.csInitialAmount) / _csRateBits;
    this.displayAmount = this.initialAmount;
    this.currency = CWallet.getCurrencyName();

    this.applyPreferences();
*/
  };
/*
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
      this.displayAmount = amount / CConst.BITS_PER_BTC;
    } else {
      this.displayAmount = parseInt(amount * _fxBits);
    }
  };

  $rootScope.$on('Local/AppletShown', function(event, applet, walletId) {
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
    if (_paymentService) {

      var amount = this.displayAmount;
      var currency = this.currency;

      // If currency is bits then convert to BTC.
      if (this.currency == 'bits') {
        currency = 'BTC';
        amount = this.displayAmount / CConst.BITS_PER_BTC;
      }

      // TODO: this.service.provider.required.buyer.fields
      var data = {
        price: amount,
        currency: currency
      };
      var memo = _paymentService.memo;

      _paymentService.createAndSendPayment(data, memo, function(err) {
        if (err) {
          $log.debug('Error with payment: ' + err.message);
        }
      });
    }
  };
*/
});
