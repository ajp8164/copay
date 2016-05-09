'use strict';

angular.module('copayApp.controllers').controller('createController',
  function($scope, $location, $anchorScroll, $rootScope, $timeout, $log, lodash, go, profileService, configService, isCordova, gettext, ledger, trezor, isMobile, isChromeApp, isDevel, derivationPathHelper, $ionicScrollDelegate) {

    var self = this;
    var defaults = configService.getDefaults();
    this.isWindowsPhoneApp = isMobile.Windows() && isCordova;
    this.account = 1;

    /* For compressed keys, m*73 + n*34 <= 496 */
    var COPAYER_PAIR_LIMITS = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 4,
      6: 4,
      7: 3,
      8: 3,
      9: 2,
      10: 2,
      11: 1,
      12: 1,
    };

    var defaults = configService.getDefaults();
    this.bwsurl = defaults.bws.url;
    this.derivationPath = derivationPathHelper.default;
    this.advanced = false;

    // ng-repeat defined number of times instead of repeating over array?
    this.getNumber = function(num) {
      return new Array(num);
    }

    var updateRCSelect = function(n) {
      self.totalCopayers = n;
      var maxReq = COPAYER_PAIR_LIMITS[n];
      self.RCValues = lodash.range(1, maxReq + 1);
      self.requiredCopayers = Math.min(parseInt(n / 2 + 1), maxReq);
    };

    var updateSeedSourceSelect = function(n) {

      self.seedOptions = [{
        id: 'new',
        label: gettext('New Random Recovery Phrase'),
      }, {
        id: 'set',
        label: gettext('Specify Recovery Phrase...'),
      }];
      self.seedSource = self.seedOptions[0];

      if (n > 1 && isChromeApp)
        self.seedOptions.push({
          id: 'ledger',
          label: 'Ledger Hardware Wallet',
        });

      if (isChromeApp || isDevel) {
        self.seedOptions.push({
          id: 'trezor',
          label: 'Trezor Hardware Wallet',
        });
      }
    };

    self.TCValues = lodash.range(2, defaults.limits.totalCopayers + 1);
    self.totalCopayers = defaults.wallet.totalCopayers;

    this.setTotalCopayers = function(tc) {
      if (tc != self.totalCopayers) {
        self.setAdvanced('createNewWallet', false);
      }
      updateRCSelect(tc);
      updateSeedSourceSelect(tc);
      self.seedSourceId = self.seedSource.id;
    };


    this.setSeedSource = function(src) {
      self.seedSourceId = src || self.seedSource.id;

      $timeout(function() {
        $rootScope.$apply();
      });
    };

    this.create = function(form) {
      if (form && form.$invalid) {
        self.error = gettext('Please enter the required fields');
        return;
      }

      var opts = {
        m: self.requiredCopayers,
        n: self.totalCopayers,
        name: self.walletName,
        myName: self.totalCopayers > 1 ? self.myName : null,
        networkName: self.isTestnet ? 'testnet' : 'livenet',
        bwsurl: self.bwsurl,
      };
      var setSeed = self.seedSourceId == 'set';
      if (setSeed) {

        var words = self.privateKey || '';
        if (words.indexOf(' ') == -1 && words.indexOf('prv') == 1 && words.length > 108) {
          opts.extendedPrivateKey = words;
        } else {
          opts.mnemonic = words;
        }
        opts.passphrase = self.passphrase;

        var pathData = derivationPathHelper.parse(self.derivationPath);
        if (!pathData) {
          self.error = gettext('Invalid derivation path');
          return;
        }

        opts.account = pathData.account;
        opts.networkName = pathData.networkName;
        opts.derivationStrategy = pathData.derivationStrategy;

      } else {
        opts.passphrase = self.createPassphrase;
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

        opts.account = account;
        self.hwWallet = self.seedSourceId == 'ledger' ? 'Ledger' : 'Trezor';
        var src = self.seedSourceId == 'ledger' ? ledger : trezor;

        src.getInfoForNewWallet(opts.n > 1, account, function(err, lopts) {
          self.hwWallet = false;
          if (err) {
            self.error = err;
            $scope.$apply();
            return;
          }
          opts = lodash.assign(lopts, opts);
          self._create(opts);
        });
      } else {
        self._create(opts);
      }
    };

    this._create = function(opts) {
      self.loading = true;
      $timeout(function() {
        profileService.createWallet(opts, function(err, walletId) {
          self.loading = false;
          if (err) {
            $log.warn(err);
            self.error = err;
            scrollUp('notification');
            $timeout(function() {
              $rootScope.$apply();
            });
            return;
          }
          go.walletHome();
          
        });
      }, 100);
    }

    function scrollUp(location){
      if(!location) return;
      $location.hash(location);
      $anchorScroll();
    };

    this.formFocus = function(what) {
      if (!self.isWindowsPhoneApp) return

      if (what && what == 'my-name') {
        self.hideWalletName = true;
        self.hideTabs = true;
      } else if (what && what == 'wallet-name') {
        self.hideTabs = true;
      } else {
        self.hideWalletName = false;
        self.hideTabs = false;
      }
      $timeout(function() {
        $rootScope.$digest();
      }, 1);
    };

    this.setAdvanced = function(handle, value) {
      self.advanced = (value == undefined ? !self.advanced : value);
      $timeout(function() {
        $ionicScrollDelegate.$getByHandle(handle).resize();
      }, 0);
    };

    $scope.$on("$destroy", function() {
      $rootScope.hideWalletNavigation = false;
    });

    updateSeedSourceSelect(1);
    self.setSeedSource('new');
  });
