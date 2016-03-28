'use strict';

angular.module('copayApp.controllers').controller('walletHomeController', function($scope, $rootScope, $interval, $timeout, $filter, $ionicModal, $log, notification, txStatus, isCordova, isMobile, profileService, lodash, configService, rateService, storageService, bitcore, isChromeApp, gettext, gettextCatalog, nodeWebkit, addressService, ledger, bwsError, confirmDialog, txFormatService, animationService, go, feeService, themeService, txService, $ionicSideMenuDelegate, $ionicScrollDelegate, txHistoryService) {

  var self = this;
  window.ignoreMobilePause = false;
  $rootScope.shouldHideMenuBar = false;
  $rootScope.wpInputFocused = false;
  var config = configService.getSync();
  var configWallet = config.wallet;
  var walletSettings = configWallet.settings;
  var ret = {};

  // INIT. Global value
  ret.unitToSatoshi = walletSettings.unitToSatoshi;
  ret.satToUnit = 1 / ret.unitToSatoshi;
  ret.unitName = walletSettings.unitName;
  ret.alternativeIsoCode = walletSettings.alternativeIsoCode;
  ret.alternativeName = walletSettings.alternativeName;
  ret.alternativeAmount = 0;
  ret.unitDecimals = walletSettings.unitDecimals;
  ret.isCordova = isCordova;
  ret.addresses = [];
  ret.isMobile = isMobile.any();
  ret.isWindowsPhoneApp = isMobile.Windows() && isCordova;
  var vanillaScope = ret;

  var disableScannerListener = $rootScope.$on('dataScanned', function(event, data) {
    self.setForm(data);
    $rootScope.$emit('Local/SetTab', 'send');

    var form = self.sendForm;
    if (form.address.$invalid && !self.blockUx) {
      self.resetForm();
      self.error = gettext('Could not recognize a valid Bitcoin QR Code');
    }
  });

  var disablePaymentUriListener = $rootScope.$on('paymentUri', function(event, uri) {
    $rootScope.$emit('Local/SetTab', 'send');
    $timeout(function() {
      self.setForm(uri);
    }, 100);
  });

  var disableAddrListener = $rootScope.$on('Local/AddressIsUsed', function() {
    self.setAddress(true);
  });

  var disableFocusListener = $rootScope.$on('Local/NewFocusedWalletReady', function() {
    self.addr = null;
    self.resetForm();
    $scope.search = '';

    if (profileService.focusedClient && profileService.focusedClient.isComplete()) {
      self.setAddress();
      self.setSendFormInputs();
    }

    $log.debug('Cleaning WalletHome Instance');
    lodash.each(self, function(v, k) {
      if (lodash.isFunction(v)) return;
      if (vanillaScope[k]) {
        self[k] = vanillaScope[k];
        return;
      }
      if (k == 'isRateAvailable') return;
      if (k == 'sendForm') return;

      delete self[k];
    });
  });

  var disableResumeListener = $rootScope.$on('Local/Resume', function() {
  });

  var disableTabListener = $rootScope.$on('Local/TabChanged', function(e, tab) {
    // This will slow down switch, do not add things here!
    switch (tab) {
      case 'receive':
        // just to be sure we have an address
        self.setAddress();
        break;
      case 'send':
        self.resetError();
    };
  });

  var disableOngoingProcessListener = $rootScope.$on('Addon/OngoingProcess', function(e, name) {
    self.setOngoingProcess(name);
  });

  $scope.$on('$destroy', function() {
    disableAddrListener();
    disableScannerListener();
    disablePaymentUriListener();
    disableTabListener();
    disableFocusListener();
    disableResumeListener();
    disableOngoingProcessListener();
    $rootScope.shouldHideMenuBar = false;
  });

  this.onQrCodeScanned = function(data) {
    if (data) go.send();
    $rootScope.$emit('dataScanned', data);
  };

  rateService.whenAvailable(function() {
    self.isRateAvailable = true;
    $rootScope.$digest();
  });

  this.getClipboard = function(cb) {
    if (!isCordova || isMobile.Windows()) return cb();

    window.cordova.plugins.clipboard.paste(function(value) {
      var fc = profileService.focusedClient;
      var Address = bitcore.Address;
      var networkName = fc.credentials.network;
      if (Address.isValid(value, networkName) && !$scope.newAddress) {
        return cb(value);
      }
    });
  };

  var accept_msg = gettextCatalog.getString('Accept');
  var cancel_msg = gettextCatalog.getString('Cancel');
  var confirm_msg = gettextCatalog.getString('Confirm');

  this.openTxSearchModal = function() {
    $scope.self = self;

    $ionicModal.fromTemplateUrl('views/modals/tx-search.html', {
      name: 'txSearch',
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.txSearchModal = modal;
      $scope.txSearchModal.show();
    });
  };

  this.completeHistory = function()
  {
    return txHistoryService.completeHistory;
  };

  this.historyShowMore = function()
  {
    return txHistoryService.historyShowMore;
  };

  this.newTx = function()
  {
    return txHistoryService.newTx;
  };

  this.showMore = function() {
    $timeout(function() {
      txHistoryService.showMore();
      $scope.$broadcast('scroll.infiniteScrollComplete');
    }, 300); // Allow the infinte scroll spinner some display time
  };

  this.txHistory = function()
  {
    return txHistoryService.txHistory;
  };

  this.txHistoryError = function()
  {
    return txHistoryService.txHistoryError;
  };

  this.txHistorySearchResults = function()
  {
    return txHistoryService.txHistorySearchResults;
  };

  this.txProgress = function()
  {
    return txHistoryService.newTx;
  };

  this.updatingTxHistory = function()
  {
    return txHistoryService.updatingTxHistory;
  };

  this.openDestinationAddressModal = function(wallets, address) {
    self.destinationWalletNeedsBackup = null;
    self.lockAddress = false;
    self._address = null;

    $scope.wallets = wallets;
    $scope.newAddress = address;
    $scope.self = self;

    $ionicModal.fromTemplateUrl('views/modals/destination-address.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false,
      animation: 'slide-in-up'
    }).then(function(modal) {
      window.location = '#/modal';
      $scope.destinationAddressModal = modal;
      $scope.destinationAddressModal.show();
    });
  };

  var GLIDERA_LOCK_TIME = 6 * 60 * 60;
  // isGlidera flag is a security measure so glidera status is not
  // only determined by the tx.message
  this.openTxpModal = function(tx, copayers, isGlidera) {
    self.tx = tx;
    self.copayers = copayers;
    self.isGlidera = isGlidera;
    self.currentSpendUnconfirmed = configWallet.spendUnconfirmed;
    $scope.self = self;

    $ionicModal.fromTemplateUrl('views/modals/txp-details.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false,
      animation: 'animated slideInRight',
    }).then(function(modal) {
      $scope.txpDetailsModal = modal;
      $scope.txpDetailsModal.show();
    });
  };

  this.setAddress = function(forceNew) {
    self.addrError = null;
    var fc = profileService.focusedClient;
    if (!fc)
      return;

    // Address already set?
    if (!forceNew && self.addr) {
      return;
    }

    self.generatingAddress = true;
    $timeout(function() {
      addressService.getAddress(fc.credentials.walletId, forceNew, function(err, addr) {
        self.generatingAddress = false;

        if (err) {
          self.addrError = err;
        } else {
          if (addr)
            self.addr = addr;
        }

        $scope.$digest();
      });
    });
  };

  this.copyToClipboard = function(addr) {
    if (isCordova) {
      window.cordova.plugins.clipboard.copy(addr);
      window.plugins.toast.showShortCenter(gettextCatalog.getString('Copied to clipboard'));
    } else if (nodeWebkit.isDefined()) {
      nodeWebkit.writeToClipboard(addr);
    }
  };

  this.shareAddress = function(addr) {
    if (isCordova) {
      if (isMobile.Android() || isMobile.Windows()) {
        window.ignoreMobilePause = true;
      }
      window.plugins.socialsharing.share('bitcoin:' + addr, null, null, null);
    }
  };

  this.openCustomizedAmountModal = function(addr) {
    $scope.addr = addr;
    $scope.self = self;

    $ionicModal.fromTemplateUrl('views/modals/customized-amount.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.customizedAmountModal = modal;
      $scope.customizedAmountModal.show();
    });
  };

  // Send

  this.canShowAlternative = function() {
    return $scope.showAlternative;
  };

  this.showAlternative = function() {
    $scope.showAlternative = true;
  };

  this.hideAlternative = function() {
    $scope.showAlternative = false;
  };

  this.resetError = function() {
    this.error = this.success = null;
  };

  this.hideMenuBar = lodash.debounce(function(hide) {
    if (hide) {
      $rootScope.shouldHideMenuBar = true;
    } else {
      $rootScope.shouldHideMenuBar = false;
    }
    $rootScope.$digest();
  }, 100);

  this.formFocus = function(what) {
    if (isCordova && !this.isWindowsPhoneApp) {
      this.hideMenuBar(what);
    }

    var self = this;
    if (isCordova && !this.isWindowsPhoneApp && what == 'address') {
      self.getClipboard(function(value) {
        if (value) {
          document.getElementById("amount").focus();
          $timeout(function() {
            window.plugins.toast.showShortCenter(gettextCatalog.getString('Pasted from clipboard'));
            self.setForm(value);
          }, 100);
        }
      });
    }

    if (!this.isWindowsPhoneApp) return

    if (!what) {
      this.hideAddress = false;
      this.hideAmount = false;

    } else {
      if (what == 'amount') {
        this.hideAddress = true;
      } else if (what == 'msg') {
        this.hideAddress = true;
        this.hideAmount = true;
      }
    }
    $timeout(function() {
      $rootScope.$digest();
    }, 1);
  };

  this.setSendFormInputs = function() {
    var unitToSat = this.unitToSatoshi;
    var satToUnit = 1 / unitToSat;
    /**
     * Setting the two related amounts as properties prevents an infinite
     * recursion for watches while preserving the original angular updates
     *
     */
    Object.defineProperty($scope,
      "_alternative", {
        get: function() {
          return $scope.__alternative;
        },
        set: function(newValue) {
          $scope.__alternative = newValue;
          if (typeof(newValue) === 'number' && self.isRateAvailable) {
            $scope._amount = parseFloat((rateService.fromFiat(newValue, self.alternativeIsoCode) * satToUnit).toFixed(self.unitDecimals), 10);
          } else {
            $scope.__amount = null;
          }
        },
        enumerable: true,
        configurable: true
      });
    Object.defineProperty($scope,
      "_amount", {
        get: function() {
          return $scope.__amount;
        },
        set: function(newValue) {
          $scope.__amount = newValue;
          if (typeof(newValue) === 'number' && self.isRateAvailable) {
            $scope.__alternative = parseFloat((rateService.toFiat(newValue * self.unitToSatoshi, self.alternativeIsoCode)).toFixed(2), 10);
          } else {
            $scope.__alternative = null;
          }
          self.alternativeAmount = $scope.__alternative;
          self.resetError();
        },
        enumerable: true,
        configurable: true
      });

    Object.defineProperty($scope,
      "_address", {
        get: function() {
          return $scope.__address;
        },
        set: function(newValue) {
          $scope.__address = self.onAddressChange(newValue);
          if (self.sendForm && self.sendForm.address.$valid) {
            self.lockAddress = true;
          }
        },
        enumerable: true,
        configurable: true
      });

    var fc = profileService.focusedClient;
    // ToDo: use a credential's (or fc's) function for this
    this.hideNote = !fc.credentials.sharedEncryptingKey;
  };

  this.setSendError = function(err) {
    var fc = profileService.focusedClient;
    var prefix =
      fc.credentials.m > 1 ? gettextCatalog.getString('Could not create payment proposal') : gettextCatalog.getString('Could not send payment');

    this.error = bwsError.msg(err, prefix);

    $timeout(function() {
      $scope.$digest();
    }, 1);
  };

  // subscription
  this.setOngoingProcess = function(name) {
    var self = this;
    self.blockUx = !!name;

    if (isCordova) {
      if (name) {
        window.plugins.spinnerDialog.hide();
        window.plugins.spinnerDialog.show(null, name + '...', true);
      } else {
        window.plugins.spinnerDialog.hide();
      }
    } else {
      self.onGoingProcess = name;
      $timeout(function() {
        $rootScope.$apply();
      });
    };
  };

  this.submitForm = function() {
    if (!$scope._amount || !$scope._address || self.destinationWalletNeedsBackup) return;
    var fc = profileService.focusedClient;
    var unitToSat = this.unitToSatoshi;
    var currentSpendUnconfirmed = configWallet.spendUnconfirmed;

    var outputs = [];

    this.resetError();

    if (isCordova && this.isWindowsPhoneApp) {
      this.hideAddress = false;
      this.hideAmount = false;
    }

    var form = self.sendForm;
    var comment = form.comment.$modelValue;

    // ToDo: use a credential's (or fc's) function for this
    if (comment && !fc.credentials.sharedEncryptingKey) {
      var msg = 'Could not add message to imported wallet without shared encrypting key';
      $log.warn(msg);
      return self.setSendError(gettext(msg));
    }

    $timeout(function() {
      var paypro = self._paypro;
      var address, amount;

      address = form.address.$modelValue;
      amount = parseInt((form.amount.$modelValue * unitToSat).toFixed(0));

      outputs.push({
        'toAddress': address,
        'amount': amount,
        'message': comment
      });

      var opts = {
        toAddress: address,
        amount: amount,
        outputs: outputs,
        message: comment,
        payProUrl: paypro ? paypro.url : null,
        lockedCurrentFeePerKb: self.lockedCurrentFeePerKb
      };

      self.setOngoingProcess(gettextCatalog.getString('Creating transaction'));
      txService.createTx(opts, function(err, txp) {
        self.setOngoingProcess();
        if (err) {
          return self.setSendError(err);
        }

        if (!fc.canSign() && !fc.isPrivKeyExternal()) {
          self.setOngoingProcess();
          $log.info('No signing proposal: No private key');
          self.resetForm();
          txStatus.notify($scope, fc, txp, function() {
            return $scope.$emit('Local/TxProposalAction');
          });
          return;
        } else {
          $rootScope.$emit('Local/NeedsConfirmation', txp, function(accept) {
            if (accept) self.confirmTx(txp);
            else self.resetForm();
          });
        }
      });

    }, 100);
  };

  this.confirmTx = function(txp) {
    var self = this;
    txService.prepare(function(err) {
      if (err) {
        return self.setSendError(err);
      }
      self.setOngoingProcess(gettextCatalog.getString('Sending transaction'));
      txService.publishTx(txp, function(err, txpPublished) {
        if (err) {
          self.setOngoingProcess();
          self.setSendError(err);
        } else {
          txService.signAndBroadcast(txpPublished, {
            reporterFn: self.setOngoingProcess.bind(self)
          }, function(err, txp) {
            self.resetForm();

            if (err) {
              self.error = err.message ? err.message : gettext('The payment was created but could not be completed. Please try again from home screen');
              $scope.$emit('Local/TxProposalAction');
              $timeout(function() {
                $scope.$digest();
              }, 1);
            } else {
              go.walletHome();
              var fc = profileService.focusedClient;
              txStatus.notify($scope, fc, txp, function() {
                $scope.$emit('Local/TxProposalAction', txp.status == 'broadcasted');
              });
            }
          });
        }
      });
    });
  };

  this.setForm = function(to, amount, comment) {
    var form = self.sendForm;
    if (to) {
      form.address.$setViewValue(to);
      form.address.$isValid = true;
      form.address.$render();
      this.lockAddress = true;
    }

    if (amount) {
      form.amount.$setViewValue("" + amount);
      form.amount.$isValid = true;
      form.amount.$render();
      this.lockAmount = true;
    }

    if (comment) {
      form.comment.$setViewValue(comment);
      form.comment.$isValid = true;
      form.comment.$render();
    }
  };

  this.resetForm = function() {
    this.resetError();
    this.destinationWalletNeedsBackup = null;
    this._paypro = null;
    this.lockedCurrentFeePerKb = null;

    this.lockAddress = false;
    this.lockAmount = false;

    this._amount = this._address = null;

    var form = self.sendForm;

    if (form && form.amount) {
      form.amount.$pristine = true;
      form.amount.$setViewValue('');
      form.amount.$render();

      form.comment.$setViewValue('');
      form.comment.$render();
      form.$setPristine();

      if (form.address) {
        form.address.$pristine = true;
        form.address.$setViewValue('');
        form.address.$render();
      }
    }
    $timeout(function() {
      $rootScope.$digest();
    }, 1);
  };

  this.openPPModal = function(paypro) {
    $scope.paypro = paypro;
    $scope.self = self;

    $ionicModal.fromTemplateUrl('views/modals/paypro.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.payproModal = modal;
      $scope.payproModal.show();
    });
  };

  this.setFromPayPro = function(uri, cb) {
    if (!cb) cb = function() {};

    var fc = profileService.focusedClient;
    if (isChromeApp) {
      this.error = gettext('Payment Protocol not supported on Chrome App');
      return cb(true);
    }

    var satToUnit = 1 / this.unitToSatoshi;
    var self = this;
    /// Get information of payment if using Payment Protocol
    self.setOngoingProcess(gettextCatalog.getString('Fetching Payment Information'));

    $log.debug('Fetch PayPro Request...', uri);
    $timeout(function() {
      fc.fetchPayPro({
        payProUrl: uri,
      }, function(err, paypro) {
        self.setOngoingProcess();

        if (err) {
          $log.warn('Could not fetch payment request:', err);
          self.resetForm();
          var msg = err.toString();
          if (msg.match('HTTP')) {
            msg = gettext('Could not fetch payment information');
          }
          self.error = msg;
          $timeout(function() {
            $rootScope.$digest();
          }, 1);
          return cb(true);
        }

        if (!paypro.verified) {
          self.resetForm();
          $log.warn('Failed to verify payment protocol signatures');
          self.error = gettext('Payment Protocol Invalid');
          $timeout(function() {
            $rootScope.$digest();
          }, 1);
          return cb(true);
        }

        self._paypro = paypro;
        self.setForm(paypro.toAddress, (paypro.amount * satToUnit).toFixed(self.unitDecimals), paypro.memo);
        _paymentTimeControl(paypro.expires);
        return cb();
      });
    }, 1);
  };

  function _paymentTimeControl(expirationTime) {
    self.paymentExpired = false;
    var countDown;
    setExpirationTime();
    countDown = $interval(function() {
      setExpirationTime();
    }, 1000);

    function setExpirationTime() {
      if (moment().isAfter(expirationTime * 1000)) {
        setExpiredPaymentValues();
        if (countDown) $interval.cancel(countDown);
      }
      self.remainingTimeStr = moment(expirationTime * 1000).fromNow();
    };

    function setExpiredPaymentValues() {
      self.paymentExpired = true;
      self.remainingTimeStr = null;
      self._paypro = null;
      self.error = gettext('Cannot sign: The payment request has expired');
    };
  };

  this.setFromUri = function(uri) {
    var self = this;

    function sanitizeUri(uri) {
      // Fixes when a region uses comma to separate decimals
      var regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
      var match = regex.exec(uri);
      if (!match || match.length === 0) {
        return uri;
      }
      var value = match[0].replace(',', '.');
      var newUri = uri.replace(regex, value);
      return newUri;
    };

    var satToUnit = 1 / this.unitToSatoshi;

    // URI extensions for Payment Protocol with non-backwards-compatible request
    if ((/^bitcoin:\?r=[\w+]/).exec(uri)) {
      uri = decodeURIComponent(uri.replace('bitcoin:?r=', ''));
      this.setFromPayPro(uri, function(err) {
        if (err) {
          return err;
        }
      });
    } else {
      uri = sanitizeUri(uri);

      if (!bitcore.URI.isValid(uri)) {
        return uri;
      }
      var parsed = new bitcore.URI(uri);

      var addr = parsed.address ? parsed.address.toString() : '';
      var message = parsed.message;

      var amount = parsed.amount ?
        (parsed.amount.toFixed(0) * satToUnit).toFixed(this.unitDecimals) : 0;


      if (parsed.r) {
        this.setFromPayPro(parsed.r, function(err) {
          if (err && addr && amount) {
            self.setForm(addr, amount, message);
            return addr;
          }
        });
      } else {
        this.setForm(addr, amount, message);
        return addr;
      }
    }

  };

  this.onAddressChange = function(value) {
    this.resetError();
    if (!value) return '';

    if (this._paypro)
      return value;

    if (value.indexOf('bitcoin:') === 0) {
      return this.setFromUri(value);
    } else if (/^https?:\/\//.test(value)) {
      return this.setFromPayPro(value);
    } else {
      return value;
    }
  };

  // History

  function strip(number) {
    return (parseFloat(number.toPrecision(12)));
  }

  this.getUnitName = function() {
    return this.unitName;
  };

  this.getAlternativeIsoCode = function() {
    return this.alternativeIsoCode;
  };

  this.openTxModal = function(btx) {
    var self = this;
    
    $scope.btx = btx;
    $scope.self = self;

    $ionicModal.fromTemplateUrl('views/modals/tx-details.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false,
      animation: 'animated slideInRight',
      hideDelay: 500
    }).then(function(modal) {
      $scope.txDetailsModal = modal;
      $scope.txDetailsModal.show();
    });
  };

  this.hasAction = function(actions, action) {
    return actions.hasOwnProperty('create');
  };

  this._doSendAll = function(amount) {
    this.setForm(null, amount, null);
  };

  this.sendAll = function(totalBytesToSendMax, availableBalanceSat) {
    var self = this;
    var availableMaxBalance;
    var feeToSendMaxStr;
    this.error = null;
    this.setOngoingProcess(gettextCatalog.getString('Calculating fee'));

    feeService.getCurrentFeeValue(function(err, feePerKb) {
      self.setOngoingProcess();
      if (err || lodash.isNull(feePerKb)) {
        self.error = gettext('Could not get fee value');
        return;
      }

      var feeToSendMaxSat = parseInt(((totalBytesToSendMax * feePerKb) / 1000.).toFixed(0));
      if (availableBalanceSat > feeToSendMaxSat) {
        self.lockedCurrentFeePerKb = feePerKb;
        availableMaxBalance = strip((availableBalanceSat - feeToSendMaxSat) * self.satToUnit);
        feeToSendMaxStr = profileService.formatAmount(feeToSendMaxSat) + ' ' + self.unitName;
      } else {
        self.error = gettext('Not enought funds for fee');
        return;
      }

      var msg = gettextCatalog.getString("{{fee}} will be deducted for bitcoin networking fees", {
        fee: feeToSendMaxStr
      });

      $scope.$apply();
      confirmDialog.show(msg, function(confirmed) {
        if (confirmed) {
          self._doSendAll(availableMaxBalance);
        } else {
          self.resetForm();
        }
      });
    });
  };

  $rootScope.$on('Local/PaymentServiceStatus', function(event, status) {
    if (status) {
      self.setOngoingProcess(status);
    } else {
      self.setOngoingProcess();
    }
  });

  $rootScope.$on('Local/PluginStatus', function(event, status) {
    if (status) {
      self.setOngoingProcess(status);
    } else {
      self.setOngoingProcess();
    }
  });

  $scope.$on('modal.hidden', function(event, modal) {
    switch(modal.name) {
      case 'txSearch':
        txHistoryService.setCompactTxHistory();
        $ionicScrollDelegate.$getByHandle('txHistory').scrollTop();
        break;
      default:
        ;
    }
  });

  if (isCordova) {
    window.StatusBar.show();

    // Hide/show status bar on iOS only.
    if (isMobile.iOS()) {
      $rootScope.$watch(function() { return $ionicSideMenuDelegate.getOpenRatio(); }, function(ratio) {
        // Hide status bar if the left or right side menu is in transition (using a small percentage threshold).
        if (ratio != 0.0) {
          window.StatusBar.hide();
        } else {
          $timeout(function() {
            window.StatusBar.show();
          }, 300);
        }
      });

      $rootScope.$watch(function() { return $ionicSideMenuDelegate.isOpen(); }, function(isOpen) {
        // Hide status bar if the left or right side menu is open.
        if (isOpen || $ionicSideMenuDelegate.getOpenRatio() != 0.0) {
          window.StatusBar.hide();
        } else {
          $timeout(function() {
            window.StatusBar.show();
          }, 300);
        }
      });
    }
  };

  /* Start setup */
  lodash.assign(self, vanillaScope);

  if (profileService.focusedClient) {
    this.setAddress();
    this.setSendFormInputs();
  }

});
