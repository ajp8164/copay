'use strict';

angular.module('copayApp.controllers').controller('joinController',
  function($scope, $rootScope, $timeout, go, notification, profileService, configService, isCordova, storageService, applicationService, gettext, lodash, ledger, trezor, isChromeApp, isDevel,derivationPathHelper, $ionicScrollDelegate) {

    var self = this;
    var defaults = configService.getDefaults();
    self.bwsurl = defaults.bws.url;
    self.derivationPath = derivationPathHelper.default;
    self.account = 1;
    self.advanced = false;

    this.onQrCodeScanned = function(data) {
      self.secret = data;
      self.joinForm.secret.$setViewValue(data);
      self.joinForm.secret.$render();
    };


    var updateSeedSourceSelect = function() {
      self.seedOptions = [{
        id: 'new',
        label: gettext('New Random Recovery Phrase'),
      }, {
        id: 'set',
        label: gettext('Specify Recovery Phrase...'),
      }];
      self.seedSource = self.seedOptions[0];


      if (isChromeApp) {
        self.seedOptions.push({
          id: 'ledger',
          label: 'Ledger Hardware Wallet',
        });
      }

      if (isChromeApp || isDevel) {
        self.seedOptions.push({
          id: 'trezor',
          label: 'Trezor Hardware Wallet',
        });
      }
    };

    this.setSeedSource = function(src) {
      self.seedSourceId = src || self.seedSource.id;

      $timeout(function() {
        $rootScope.$apply();
      });
    };

    this.join = function(form) {
      if (form && form.$invalid) {
        self.error = gettext('Please enter the required fields');
        return;
      }

      var opts = {
        secret: form.secret.$modelValue,
        myName: form.myName.$modelValue,
        bwsurl: self.bwsurl,
      }

      var setSeed = self.seedSourceId =='set';
      if (setSeed) {
        var words = form.privateKey.$modelValue;
        if (words.indexOf(' ') == -1 && words.indexOf('prv') == 1 && words.length > 108) {
          opts.extendedPrivateKey = words;
        } else {
          opts.mnemonic = words;
        }
        opts.passphrase = form.passphrase.$modelValue;

        var pathData = derivationPathHelper.parse(self.derivationPath);
        if (!pathData) {
          self.error = gettext('Invalid derivation path');
          return;
        }
        opts.account = pathData.account;
        opts.networkName = pathData.networkName;
        opts.derivationStrategy = pathData.derivationStrategy;
      } else {
        opts.passphrase = form.createPassphrase.$modelValue;
      }

      if (setSeed && !opts.mnemonic && !opts.extendedPrivateKey) {
        self.error = gettext('Please enter the wallet recovery phrase');
        return;
      }

      if (self.seedSourceId == 'ledger' || self.seedSourceId == 'trezor') {
        var account = self.account;
        if (!account || account < 1) {
          self.error = gettext('Invalid account number');
          return;
        }

        if ( self.seedSourceId == 'trezor')
          account = account - 1;

        opts.account =  account;
        self.hwWallet = self.seedSourceId == 'ledger' ? 'Ledger' : 'Trezor';
        var src = self.seedSourceId == 'ledger' ? ledger : trezor;

        src.getInfoForNewWallet(true, account, function(err, lopts) {
          self.hwWallet = false;
          if (err) {
            self.error = err;
            $scope.$apply();
            return;
          }
          opts = lodash.assign(lopts, opts);
          self._join(opts);
        });
      } else {
        self._join(opts);
      }
    };

    this._join = function(opts) {
      self.loading = true;
      $timeout(function() {
        profileService.joinWallet(opts, function(err) {
          if (err) {
            self.loading = false;
            self.error = err;
            $rootScope.$apply();
            return;
          }
          go.walletHome();

        });
      }, 100);
    };

    this.setAdvanced = function(handle, value) {
      self.advanced = (value == undefined ? !self.advanced : value);
      $timeout(function() {
        $ionicScrollDelegate.$getByHandle(handle).resize();
      }, 0);
    };

    updateSeedSourceSelect();
    self.setSeedSource('new');
  });
