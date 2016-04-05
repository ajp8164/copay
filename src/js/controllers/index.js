'use strict';

angular.module('copayApp.controllers').controller('indexController', function($rootScope, $scope, $log, $filter, $timeout, bwcService, pushNotificationsService, lodash, go, profileService, configService, isCordova, rateService, storageService, addressService, gettext, gettextCatalog, amMoment, nodeWebkit, addonManager, isChromeApp, bwsError, txFormatService, uxLanguage, $state, glideraService, isMobile, addressbookService, themeService, brand, txHistoryService) {
  var self = this;
  var errors = bwcService.getErrors();

  var features = '';
  features += (brand.features.glidera.enabled ? 'Glidera,' : '');
  features += (brand.features.theme.themeDiscovery.enabled ? 'Theme Discovery,' : '');
  features += (brand.features.theme.skinDiscovery.enabled ? 'Skin Discovery,' : '');
  features += (brand.features.theme.skinGallery.enabled ? 'Skin Gallery,' : '');
  features += (brand.features.theme.applets.enabled ? 'Applets,' : '');
  features += (brand.features.theme.socialLike.enabled ? 'Like Themes & Skins,' : '');
  $log.debug('Application branding: ' + brand.shortName);
  $log.debug('Enabled features: ' + features.substring(0, features.length-1));

  var ret = {};
  ret.isCordova = isCordova;
  ret.isChromeApp = isChromeApp;
  ret.isSafari = isMobile.Safari();
  ret.useViewManagedStatusBar = isMobile.iOS() && isCordova;
  ret.isWindowsPhoneApp = isMobile.Windows() && isCordova;
  ret.usePushNotifications = ret.isCordova && !isMobile.Windows();
  ret.onGoingProcess = {};
  ret.prevState = 'walletHome';
  ret.physicalScreenWidth = ((window.innerWidth > 0) ? window.innerWidth : screen.width);
  ret.physicalScreenHeight = ((window.innerHeight > 0) ? window.innerHeight : screen.height);
  ret.brand = brand;

  ret.menu = [{

    'title': gettext('Receive'),
    'icon': {
      false: 'icon-receive',
      true: 'icon-receive-active'
    },
    'link': 'receive'
  }, {
    'title': gettext('Activity'),
    'icon': {
      false: 'icon-activity',
      true: 'icon-activity-active'
    },
    'link': 'walletHome'
  }, {
    'title': gettext('Send'),
    'icon': {
      false: 'icon-send',
      true: 'icon-send-active'
    },
    'link': 'send'
  }];

  ret.addonViews = addonManager.addonViews();
  ret.menu = ret.menu.concat(addonManager.addonMenuItems());
  ret.menuItemSize = ret.menu.length > 4 ? 2 : 4;
  ret.txTemplateUrl = addonManager.txTemplateUrl() || 'views/includes/transaction.html';

  ret.tab = 'walletHome';
  var vanillaScope = ret;

  function strip(number) {
    return (parseFloat(number.toPrecision(12)));
  };

  self.goHome = function() {
    go.walletHome();
  };

  self.setOngoingProcess = function(processName, isOn) {
    $log.debug('onGoingProcess', processName, isOn);
    self[processName] = isOn;
    self.onGoingProcess[processName] = isOn;

    var name;
    self.anyOnGoingProcess = lodash.any(self.onGoingProcess, function(isOn, processName) {
      if (isOn)
        name = name || processName;
      return isOn;
    });
    // The first one
    self.onGoingProcessName = name;
    $timeout(function() {
      $rootScope.$apply();
    });
  };

  self.cleanInstance = function() {
    $log.debug('Cleaning Index Instance');
    lodash.each(self, function(v, k) {
      if (lodash.isFunction(v)) return;
      // This are to prevent flicker in mobile:
      if (k == 'hasProfile') return;
      if (k == 'tab') return;
      if (k == 'noFocusedWallet') return;
      if (k == 'backgroundColor') return;
      if (k == 'loadingWallet') {
        self.loadingWallet = true;
        return;
      }
      if (vanillaScope[k]) {
        self[k] = vanillaScope[k];
        return;
      }

      delete self[k];
    });
  };

  self.setFocusedWallet = function() {
    var fc = profileService.focusedClient;
    if (!fc) return;

    $log.debug('Set focus:', fc.credentials.walletId);
    
    self.cleanInstance();
    self.loadingWallet = true;
    self.setSpendUnconfirmed();

    $timeout(function() {
      $rootScope.$apply();
      self.hasProfile = true;
      self.noFocusedWallet = false;
      self.onGoingProcess = {};

      // Credentials Shortcuts
      self.m = fc.credentials.m;
      self.n = fc.credentials.n;
      self.network = fc.credentials.network;
      self.copayerId = fc.credentials.copayerId;
      self.copayerName = fc.credentials.copayerName;
      self.requiresMultipleSignatures = fc.credentials.m > 1;
      self.isShared = fc.credentials.n > 1;
      self.walletName = fc.credentials.walletName;
      self.walletId = fc.credentials.walletId;
      self.isComplete = fc.isComplete();
      self.canSign = fc.canSign();
      self.isPrivKeyExternal = fc.isPrivKeyExternal();
      self.isPrivKeyEncrypted = fc.isPrivKeyEncrypted();
      self.externalSource = fc.getPrivKeyExternalSourceName();
      self.account = fc.credentials.account;

      if (self.externalSource == 'trezor')
        self.account++;

      self.txps = [];
      self.copayers = [];
      self.updateSkin();
      self.updateAlias();
      self.setAddressbook();

      self.initGlidera();

      self.setCustomBWSFlag();

      if (!self.isComplete) {
        $log.debug('Wallet not complete BEFORE update... redirecting');
        go.path('copayers');
      } else {
        if ($state.is('copayers')) {
          $log.debug('Wallet Complete BEFORE update... redirect to home');
          go.walletHome();
        }
      }

      profileService.isBackupNeeded(self.walletId, function(needsBackup) {
        self.needsBackup = needsBackup;
        self.openWallet(function() {
          if (!self.isComplete) {
            $log.debug('Wallet not complete after update... redirecting');
            go.path('copayers');
          } else {
            if ($state.is('copayers')) {
              $log.debug('Wallet Complete after update... redirect to home');
              go.walletHome();
            }
          }
        });
      });
    });
  };

  self.setCustomBWSFlag = function() {
    var defaults = configService.getDefaults();
    var config = configService.getSync();

    self.usingCustomBWS = config.bwsFor && config.bwsFor[self.walletId] && (config.bwsFor[self.walletId] != defaults.bws.url);
  };

  self.setTab = function(tab, reset, tries, switchState) {
    tries = tries || 0;

    // check if the whole menu item passed
    if (typeof tab == 'object') {
      if (tab.open) {
        if (tab.link) {
          self.tab = tab.link;
        }
        tab.open();
        return;
      } else {
        return self.setTab(tab.link, reset, tries, switchState);
      }
    }
    if (self.tab === tab && !reset)
      return;

    if (!document.getElementById('menu-' + tab) && ++tries < 5) {
      return $timeout(function() {
        self.setTab(tab, reset, tries, switchState);
      }, 300);
    }

    if (!self.tab || !$state.is('walletHome'))
      self.tab = 'walletHome';

    var changeTab = function() {
      if (document.getElementById(self.tab)) {
        document.getElementById(self.tab).className = 'tab-out tab-view ' + self.tab;
        var old = document.getElementById('menu-' + self.tab);
        if (old) {
          old.className = '';
        }
      }

      if (document.getElementById(tab)) {
        document.getElementById(tab).className = 'tab-in  tab-view ' + tab;
        var newe = document.getElementById('menu-' + tab);
        if (newe) {
          newe.className = 'active';
        }
      }

      self.tab = tab;
      $rootScope.$emit('Local/TabChanged', tab);
    };

    if (switchState && !$state.is('walletHome')) {
      go.path('walletHome', function() {
        changeTab();
      });
      return;
    }

    changeTab();
  };


  self._updateRemotePreferencesFor = function(clients, prefs, cb) {
    var client = clients.shift();

    if (!client)
      return cb();

    $log.debug('Saving remote preferences', client.credentials.walletName, prefs);
    client.savePreferences(prefs, function(err) {
      // we ignore errors here
      if (err) $log.warn(err);

      self._updateRemotePreferencesFor(clients, prefs, cb);
    });
  };


  self.updateRemotePreferences = function(opts, cb) {
    var prefs = opts.preferences || {};
    var fc = profileService.focusedClient;

    // Update this JIC.
    var config = configService.getSync().wallet.settings;

    //prefs.email  (may come from arguments)
    prefs.language = self.defaultLanguageIsoCode;
    prefs.unit = config.unitCode;

    var clients = [];
    if (opts.saveAll) {
      clients = lodash.values(profileService.walletClients);
    } else {
      clients = [fc];
    };

    self._updateRemotePreferencesFor(clients, prefs, function(err) {
      if (err) return cb(err);
      if (!fc) return cb();

      fc.getPreferences(function(err, preferences) {
        if (err) {
          return cb(err);
        }
        self.preferences = preferences;
        return cb();
      });
    });
  };

  var _walletStatusHash = function(walletStatus) {
    var bal;
    if (walletStatus) {
      bal = walletStatus.balance.totalAmount;
    } else {
      bal = self.totalBalanceSat;
    }
    return bal;
  };

  self.doPullToRefresh = function() {
    self.updateAll({triggerTxUpdate: true});
    $scope.$broadcast('scroll.refreshComplete');
  };

  self.updateAll = function(opts, initStatusHash, tries) {
    tries = tries || 0;
    opts = opts || {};

    var walletId = profileService.focusedClient.credentials.walletId

    if (opts.untilItChanges && lodash.isUndefined(initStatusHash)) {
      initStatusHash = _walletStatusHash();
      $log.debug('Updating status until it changes. initStatusHash:' + initStatusHash)
    }
    var get = function(cb) {
      if (opts.walletStatus)
        return cb(null, opts.walletStatus);
      else {
        self.updateError = false;
        return fc.getStatus({
          twoStep: true
        }, function(err, ret) {
          if (err) {
            self.updateError = bwsError.msg(err, gettext('Could not update Wallet'));
          } else {
            if (!opts.quiet)
              self.setOngoingProcess('scanning', ret.wallet.scanStatus == 'running');
          }
          return cb(err, ret);
        });
      }
    };

    var fc = profileService.focusedClient;
    if (!fc) return;


    // If not untilItChanges...trigger history update now
    if (opts.triggerTxUpdate && !opts.untilItChanges) {
      $timeout(function() {
        self.debounceUpdateHistory();
      }, 1);
    }

    $timeout(function() {

      if (!opts.quiet)
        self.setOngoingProcess('updatingStatus', true);

      $log.debug('Updating Status:', fc.credentials.walletName, tries);
      get(function(err, walletStatus) {
        var currentStatusHash = _walletStatusHash(walletStatus);
        $log.debug('Status update. hash:' + currentStatusHash + ' Try:' + tries);
        if (!err && opts.untilItChanges && initStatusHash == currentStatusHash && tries < 7 && walletId == profileService.focusedClient.credentials.walletId) {
          return $timeout(function() {
            $log.debug('Retrying update... Try:' + tries)
            return self.updateAll({
              walletStatus: null,
              untilItChanges: true,
              triggerTxUpdate: opts.triggerTxUpdate,
            }, initStatusHash, ++tries);
          }, 1400 * tries);
        }

        if (walletId != profileService.focusedClient.credentials.walletId)
          return;

        if (!opts.quiet)
          self.setOngoingProcess('updatingStatus', false);


        if (err) {
          self.handleError(err);
          self.loadingWallet = false;
          return;
        }
        $log.debug('Wallet Status:', walletStatus);
        self.setPendingTxps(walletStatus.pendingTxps);

        // Status Shortcuts
        self.walletName = walletStatus.wallet.name;
        self.walletSecret = walletStatus.wallet.secret;
        self.walletStatus = walletStatus.wallet.status;
        self.walletScanStatus = walletStatus.wallet.scanStatus;
        self.copayers = walletStatus.wallet.copayers;
        self.preferences = walletStatus.preferences;
        self.setBalance(walletStatus.balance);
        self.otherWallets = lodash.filter(profileService.getWallets(self.network), function(w) {
          return w.id != self.walletId;
        });

        // Notify external addons or plugins
        $rootScope.$emit('Local/BalanceUpdated', walletStatus.balance);
        $rootScope.$emit('Local/WalletStatus', walletStatus);
        $rootScope.$apply();


        if (opts.triggerTxUpdate && opts.untilItChanges) {
          $timeout(function() {
            self.debounceUpdateHistory();
          }, 1);
        } else {
          self.loadingWallet = false;
        }

        if (opts.cb) return opts.cb();
      });
    });
  };

  self.setSpendUnconfirmed = function(spendUnconfirmed) {
    self.spendUnconfirmed = spendUnconfirmed || configService.getSync().wallet.spendUnconfirmed;
  };

  self.updateBalance = function() {
    var fc = profileService.focusedClient;
    $timeout(function() {
      self.setOngoingProcess('updatingBalance', true);
      $log.debug('Updating Balance');
      fc.getBalance(function(err, balance) {
        self.setOngoingProcess('updatingBalance', false);
        if (err) {
          self.handleError(err);
          return;
        }
        $log.debug('Wallet Balance:', balance);
        self.setBalance(balance);
      });
    });
  };

  self.updatePendingTxps = function() {
    var fc = profileService.focusedClient;
    $timeout(function() {
      self.setOngoingProcess('updatingPendingTxps', true);
      $log.debug('Updating PendingTxps');
      fc.getTxProposals({}, function(err, txps) {
        self.setOngoingProcess('updatingPendingTxps', false);
        if (err) {
          self.handleError(err);
        } else {
          $log.debug('Wallet PendingTxps:', txps);
          self.setPendingTxps(txps);
        }
        $rootScope.$apply();
      });
    });
  };

  // This handles errors from BWS/index which normally
  // trigger from async events (like updates).
  // Debounce function avoids multiple popups
  var _handleError = function(err) {
    $log.warn('Client ERROR: ', err);
    if (err instanceof errors.NOT_AUTHORIZED) {
      self.notAuthorized = true;
      go.walletHome();
    } else if (err instanceof errors.NOT_FOUND) {
      self.showErrorPopup(gettext('Could not access Wallet Service: Not found'));
    } else {
      var msg = ""
      $scope.$emit('Local/ClientError', (err.error ? err.error : err));
      var msg = bwsError.msg(err, gettext('Error at Wallet Service'));
      self.showErrorPopup(msg);
    }
  };

  self.handleError = lodash.debounce(_handleError, 1000);

  self.openWallet = function(cb) {
    var fc = profileService.focusedClient;
    $timeout(function() {
      $rootScope.$apply();
      self.setOngoingProcess('openingWallet', true);
      self.updateError = false;
      fc.openWallet(function(err, walletStatus) {
        self.setOngoingProcess('openingWallet', false);
        if (err) {
          self.updateError = true;
          self.handleError(err);
          return;
        }
        $log.debug('Wallet Opened');

        self.updateAll(lodash.isObject(walletStatus) ? {
          walletStatus: walletStatus,
          cb: cb,
        } : {
          cb: cb
        });
        $rootScope.$apply();
      });
    });
  };

  self.setPendingTxps = function(txps) {
    self.pendingTxProposalsCountForUs = 0;
    var now = Math.floor(Date.now() / 1000);

    /* Uncomment to test multiple outputs */
    /*
    var txp = {
      message: 'test multi-output',
      fee: 1000,
      createdOn: new Date() / 1000,
      outputs: []
    };
    function addOutput(n) {
      txp.outputs.push({
        amount: 600,
        toAddress: '2N8bhEwbKtMvR2jqMRcTCQqzHP6zXGToXcK',
        message: 'output #' + (Number(n) + 1)
      });
    };
    lodash.times(150, addOutput);
    txps.push(txp);
    */

    lodash.each(txps, function(tx) {

      tx = txFormatService.processTx(tx);

      // no future transactions...
      if (tx.createdOn > now)
        tx.createdOn = now;

      var action = lodash.find(tx.actions, {
        copayerId: self.copayerId
      });

      if (!action && tx.status == 'pending') {
        tx.pendingForUs = true;
      }

      if (action && action.type == 'accept') {
        tx.statusForUs = 'accepted';
      } else if (action && action.type == 'reject') {
        tx.statusForUs = 'rejected';
      } else {
        tx.statusForUs = 'pending';
      }

      if (!tx.deleteLockTime)
        tx.canBeRemoved = true;

      if (tx.creatorId != self.copayerId) {
        self.pendingTxProposalsCountForUs = self.pendingTxProposalsCountForUs + 1;
      }
      addonManager.formatPendingTxp(tx);
    });
    self.txps = txps;
  };

  self.updateAlias = function() {
    var config = configService.getSync();
    config.aliasFor = config.aliasFor || {};
    self.alias = config.aliasFor[self.walletId];
    var fc = profileService.focusedClient;
    fc.alias = self.alias;
  };

  self.updateSkin = function() {
    themeService.updateSkin(self.walletId);
  };

  self.setBalance = function(balance) {
    if (!balance) return;
    var config = configService.getSync().wallet.settings;
    var COIN = 1e8;

    // Address with Balance
    self.balanceByAddress = balance.byAddress;

    // Spend unconfirmed funds
    if (self.spendUnconfirmed) {
      self.totalBalanceSat = balance.totalAmount;
      self.lockedBalanceSat = balance.lockedAmount;
      self.availableBalanceSat = balance.availableAmount;
      self.totalBytesToSendMax = balance.totalBytesToSendMax;
      self.pendingAmount = null;
    } else {
      self.totalBalanceSat = balance.totalConfirmedAmount;
      self.lockedBalanceSat = balance.lockedConfirmedAmount;
      self.availableBalanceSat = balance.availableConfirmedAmount;
      self.totalBytesToSendMax = balance.totalBytesToSendConfirmedMax;
      self.pendingAmount = balance.totalAmount - balance.totalConfirmedAmount;
    }

    // Selected unit
    self.unitToSatoshi = config.unitToSatoshi;
    self.satToUnit = 1 / self.unitToSatoshi;
    self.unitName = config.unitName;

    //STR
    self.totalBalanceStr = txFormatService.formatAmount(self.totalBalanceSat) + ' ' + self.unitName;
    self.lockedBalanceStr = txFormatService.formatAmount(self.lockedBalanceSat) + ' ' + self.unitName;
    self.availableBalanceStr = txFormatService.formatAmount(self.availableBalanceSat) + ' ' + self.unitName;

    if (self.pendingAmount) {
      self.pendingAmountStr = txFormatService.formatAmount(self.pendingAmount) + ' ' + self.unitName;
    } else {
      self.pendingAmountStr = null;
    }

    self.alternativeName = config.alternativeName;
    self.alternativeIsoCode = config.alternativeIsoCode;

    // Check address
    addressService.isUsed(self.walletId, balance.byAddress, function(err, used) {
      if (used) {
        $log.debug('Address used. Creating new');
        $rootScope.$emit('Local/AddressIsUsed');
      }
    });

    rateService.whenAvailable(function() {

      var totalBalanceAlternative = rateService.toFiat(self.totalBalanceSat, self.alternativeIsoCode);
      var lockedBalanceAlternative = rateService.toFiat(self.lockedBalanceSat, self.alternativeIsoCode);
      var alternativeConversionRate = rateService.toFiat(100000000, self.alternativeIsoCode);

      self.totalBalanceAlternative = $filter('noFractionNumber')(totalBalanceAlternative, 2);
      self.lockedBalanceAlternative = $filter('noFractionNumber')(lockedBalanceAlternative, 2);
      self.alternativeConversionRate = $filter('noFractionNumber')(alternativeConversionRate, 2);

      self.alternativeBalanceAvailable = true;

      self.isRateAvailable = true;
      $rootScope.$apply();
    });

    if (!rateService.isAvailable()) {
      $rootScope.$apply();
    }
  };

  self.setCompactTxHistory = function() {
    txHistoryService.setCompactTxHistory();
  };

  self.csvHistory = function() {
    return txHistoryService.csvHistory();
  };

  self.debounceUpdateHistory = lodash.debounce(function() {
    txHistoryService.updateHistory();
  }, 1000);

  self.throttledUpdateHistory = lodash.throttle(function() {
    txHistoryService.updateHistory();
  }, 5000);

  self.showErrorPopup = function(msg, cb) {
    $log.warn('Showing err popup:' + msg);
    self.showAlert = {
      msg: msg,
      close: function() {
        self.showAlert = null;
        if (cb) return cb();
      },
    };
    $timeout(function() {
      $rootScope.$apply();
    });
  };

  self.recreate = function(cb) {
    var fc = profileService.focusedClient;
    self.setOngoingProcess('recreating', true);
    fc.recreateWallet(function(err) {
      self.notAuthorized = false;
      self.setOngoingProcess('recreating', false);

      if (err) {
        self.handleError(err);
        $rootScope.$apply();
        return;
      }

      profileService.setWalletClients();
      self.startScan(self.walletId);
    });
  };

  self.isWalletHomeReady = function() {
    return go.isWalletHomeReady();
  };

  self.toggleLeftMenu = function() {
    profileService.isDisclaimerAccepted(function(val){
      if (val) go.toggleLeftMenu();
      else 
        $log.debug('Disclaimer not accepted, cannot open menu');
    });
  };

  self.toggleRightMenu = function() {
    profileService.isDisclaimerAccepted(function(val){
      if (val) go.toggleRightMenu();
      else 
        $log.debug('Disclaimer not accepted, cannot open menu');
    });
  };

  self.retryScan = function() {
    var self = this;
    self.startScan(self.walletId);
  }

  self.startScan = function(walletId) {
    $log.debug('Scanning wallet ' + walletId);
    var c = profileService.walletClients[walletId];
    if (!c.isComplete()) return;

    if (self.walletId == walletId)
      self.setOngoingProcess('scanning', true);

    c.startScan({
      includeCopayerBranches: true,
    }, function(err) {
      if (err && self.walletId == walletId) {
        self.setOngoingProcess('scanning', false);
        self.handleError(err);
        $rootScope.$apply();
      }
    });
  };

  self.setUxLanguage = function(cb) {
    uxLanguage.update(function(lang) {
      var userLang = lang;
      self.defaultLanguageIsoCode = userLang;
      self.defaultLanguageName = uxLanguage.getName(userLang);
      if (cb) return cb();
    });
  };

  self.initGlidera = function(accessToken) {
    self.glideraVisible = configService.getSync().glidera.visible;
    self.glideraTestnet = configService.getSync().glidera.testnet;
    var network = self.glideraTestnet ? 'testnet' : 'livenet';

    self.glideraToken = null;
    self.glideraError = null;
    self.glideraPermissions = null;
    self.glideraEmail = null;
    self.glideraPersonalInfo = null;
    self.glideraTxs = null;
    self.glideraStatus = null;

    if (!self.glideraVisible) return;

    glideraService.setCredentials(network);

    var getToken = function(cb) {
      if (accessToken) {
        cb(null, accessToken);
      } else {
        storageService.getGlideraToken(network, cb);
      }
    };

    getToken(function(err, accessToken) {
      if (err || !accessToken) return;
      else {
        self.glideraLoading = 'Connecting to Glidera...';
        glideraService.getAccessTokenPermissions(accessToken, function(err, p) {
          self.glideraLoading = null;
          if (err) {
            self.glideraError = err;
          } else {
            self.glideraToken = accessToken;
            self.glideraPermissions = p;
            self.updateGlidera({
              fullUpdate: true
            });
          }
        });
      }
    });
  };

  self.updateGlidera = function(opts) {
    if (!self.glideraToken || !self.glideraPermissions) return;
    var accessToken = self.glideraToken;
    var permissions = self.glideraPermissions;

    opts = opts || {};

    glideraService.getStatus(accessToken, function(err, data) {
      self.glideraStatus = data;
    });

    glideraService.getLimits(accessToken, function(err, limits) {
      self.glideraLimits = limits;
    });

    if (permissions.transaction_history) {
      self.glideraLoadingHistory = 'Getting Glidera transactions...';
      glideraService.getTransactions(accessToken, function(err, data) {
        self.glideraLoadingHistory = null;
        self.glideraTxs = data;
      });
    }

    if (permissions.view_email_address && opts.fullUpdate) {
      self.glideraLoadingEmail = 'Getting Glidera Email...';
      glideraService.getEmail(accessToken, function(err, data) {
        self.glideraLoadingEmail = null;
        self.glideraEmail = data.email;
      });
    }
    if (permissions.personal_info && opts.fullUpdate) {
      self.glideraLoadingPersonalInfo = 'Getting Glidera Personal Information...';
      glideraService.getPersonalInfo(accessToken, function(err, data) {
        self.glideraLoadingPersonalInfo = null;
        self.glideraPersonalInfo = data;
      });
    }

  };

  self.setAddressbook = function(ab) {
    if (ab) {
      self.addressbook = ab;
      return;
    }

    addressbookService.list(function(err, ab) {
      if (err) {
        $log.error('Error getting the addressbook');
        return;
      }
      self.addressbook = ab;
    });
  };

  $rootScope.$on('$stateChangeSuccess', function(ev, to, toParams, from, fromParams) {
    self.prevState = from.name || 'walletHome';
    self.tab = 'walletHome';
  });

  $rootScope.$on('Local/ClearHistory', function(event) {
    $log.debug('The wallet transaction history has been deleted');
    txHistoryService.txHistory = txHistoryService.completeHistory = txHistoryService.txHistorySearchResults = [];
    self.debounceUpdateHistory();
  });

  $rootScope.$on('Local/AddressbookUpdated', function(event, ab) {
    self.setAddressbook(ab);
  });

  // UX event handlers

  $rootScope.$on('Local/AliasUpdated', function(event) {
    self.updateAlias();
    $timeout(function() {
      $rootScope.$apply();
    });
  });

  $rootScope.$on('Local/SpendUnconfirmedUpdated', function(event, spendUnconfirmed) {
    self.setSpendUnconfirmed(spendUnconfirmed);
    self.updateAll();
  });

  $rootScope.$on('Local/ProfileBound', function() {
    storageService.getRemotePrefsStoredFlag(function(err, val) {
      if (err || val) return;
      self.updateRemotePreferences({
        saveAll: true
      }, function() {
        $log.debug('Remote preferences saved');
        storageService.setRemotePrefsStoredFlag(function() {});
      });
    });
  });

  $rootScope.$on('Local/LanguageSettingUpdated', function() {
    self.setUxLanguage(function() {
      self.updateRemotePreferences({
        saveAll: true
      }, function() {
        $log.debug('Remote preferences saved')
      });
    });
  });

  $rootScope.$on('Local/GlideraUpdated', function(event, accessToken) {
    self.initGlidera(accessToken);
  });

  $rootScope.$on('Local/GlideraTx', function(event, accessToken, permissions) {
    self.updateGlidera();
  });

  $rootScope.$on('Local/GlideraError', function(event) {
    self.debouncedUpdate();
  });

  $rootScope.$on('Local/UnitSettingUpdated', function(event) {
    self.updateAll({
      triggerTxUpdate: true,
    });
    self.updateRemotePreferences({
      saveAll: true
    }, function() {
      $log.debug('Remote preferences saved')
    });
  });

  $rootScope.$on('Local/EmailSettingUpdated', function(event, email, cb) {
    self.updateRemotePreferences({
      preferences: {
        email: email || null
      },
    }, cb);
  });

  $rootScope.$on('Local/WalletCompleted', function(event, walletId) {
    var fc = profileService.focusedClient;
    if (fc && fc.credentials.walletId == walletId) {
      // reset main wallet variables
      self.setFocusedWallet();
      go.walletHome();
    }
  });

  $rootScope.$on('Local/ProfileCreated', function(event) {
    self.updateRemotePreferences({
      saveAll: true
    }, function() {
      $log.debug('Remote preferences saved');
    });
  });

  $rootScope.$on('Local/pushNotificationsReady', function(event) {
    pushNotificationsService.enableNotifications(profileService.walletClients);
  });

  self.debouncedUpdate = lodash.throttle(function() {
    self.updateAll({
      quiet: true
    });
    self.debounceUpdateHistory();
  }, 2000, {
    leading: false,
    trailing: true
  });

  $rootScope.$on('Local/Resume', function(event) {
    $log.debug('### Resume event');
    profileService.isDisclaimerAccepted(function(v) {
      if (!v) {
        $log.debug('Disclaimer not accepted, resume to home');
        go.path('disclaimer');
      }
    });
    self.debouncedUpdate();
  });

  $rootScope.$on('Local/BackupDone', function(event, walletId) {
    self.needsBackup = false;
    $log.debug('Backup done');
    storageService.setBackupFlag(walletId || self.walletId, function(err) {
      $log.debug('Backup stored');
    });
  });

  $rootScope.$on('Local/DeviceError', function(event, err) {
    self.showErrorPopup(err, function() {
      if (self.isCordova && navigator && navigator.app) {
        navigator.app.exitApp();
      }
    });
  });

  $rootScope.$on('Local/WalletImported', function(event, walletId) {
    self.needsBackup = false;
    storageService.setBackupFlag(walletId, function() {
      $log.debug('Backup done stored');
      addressService.expireAddress(walletId, function(err) {
        $timeout(function() {
          txHistoryService.txHistory = txHistoryService.completeHistory = txHistoryService.txHistorySearchResults = [];
          storageService.removeTxHistory(walletId, function() {
            self.startScan(walletId);
          });
        }, 500);
      });
    });
  });

  $rootScope.$on('NewIncomingTx', function() {
    self.newTx = true;
    self.updateAll({
      walletStatus: null,
      untilItChanges: true,
      triggerTxUpdate: true,
    });
  });


  $rootScope.$on('NewBlock', function() {
    if (self.glideraVisible) {
      $timeout(function() {
        self.updateGlidera();
      });
    }
    if (self.pendingAmount) {
      self.updateAll({
        walletStatus: null,
        untilItChanges: null,
        triggerTxUpdate: true,
      });
    } else if (txHistoryService.hasUnsafeConfirmed) {
      $log.debug('Wallet has transactions with few confirmations. Updating.')
      if (self.network == 'testnet') {
        self.throttledUpdateHistory();
      } else {
        self.debounceUpdateHistory();
      }
    }
  });

  $rootScope.$on('BalanceUpdated', function(e, n) {
    self.setBalance(n.data);
  });


  //untilItChange TRUE
  lodash.each(['NewOutgoingTx', 'NewOutgoingTxByThirdParty'], function(eventName) {
    $rootScope.$on(eventName, function(event) {
      self.newTx = true;
      self.updateAll({
        walletStatus: null,
        untilItChanges: true,
        triggerTxUpdate: true,
      });
    });
  });

  //untilItChange FALSE 
  lodash.each(['NewTxProposal', 'TxProposalFinallyRejected', 'TxProposalRemoved', 'NewOutgoingTxByThirdParty',
    'Local/GlideraTx'
  ], function(eventName) {
    $rootScope.$on(eventName, function(event) {
      self.updateAll({
        walletStatus: null,
        untilItChanges: null,
        triggerTxUpdate: true,
      });
    });
  });


  //untilItChange Maybe
  $rootScope.$on('Local/TxProposalAction', function(event, untilItChanges) {
    self.newTx = untilItChanges;
    self.updateAll({
      walletStatus: null,
      untilItChanges: untilItChanges,
      triggerTxUpdate: true,
    });
  });

  $rootScope.$on('ScanFinished', function() {
    $log.debug('Scan Finished. Updating history');
    storageService.removeTxHistory(self.walletId, function() {
      self.updateAll({
        walletStatus: null,
        triggerTxUpdate: true,
      });
    });
  });

  lodash.each(['TxProposalRejectedBy', 'TxProposalAcceptedBy'], function(eventName) {
    $rootScope.$on(eventName, function() {
      var f = function() {
        if (self.updatingStatus) {
          return $timeout(f, 200);
        };
        self.updatePendingTxps();
      };
      f();
    });
  });

  $rootScope.$on('Local/NoWallets', function(event) {

    $timeout(function() {
      self.hasProfile = true;
      self.noFocusedWallet = true;
      self.isComplete = null;
      self.walletName = null;
      self.setUxLanguage();
      profileService.isDisclaimerAccepted(function(v) {
        if (v) {
          go.path('import');
        }
      });
    });
  });

  $rootScope.$on('Local/NewFocusedWallet', function() {
    self.setUxLanguage();
    self.setFocusedWallet();
    // Set wallet to home view only when disclaimer has been accepted.
    profileService.isDisclaimerAccepted(function(val) {
      if (val) {
        go.walletHome();
      }
    });
    txHistoryService.updateHistory();
    storageService.getCleanAndScanAddresses(function(err, walletId) {

      if (walletId && profileService.walletClients[walletId]) {
        $log.debug('Clear last address cache and Scan ', walletId);
        addressService.expireAddress(walletId, function(err) {
          self.startScan(walletId);
        });
        storageService.removeCleanAndScanAddresses(function() {
          $rootScope.$emit('Local/NewFocusedWalletReady');
        });
      } else {
        $rootScope.$emit('Local/NewFocusedWalletReady');
      }
    });
  });

  $rootScope.$on('Local/SetTab', function(event, tab, reset) {
    self.setTab(tab, reset);
  });

  $rootScope.$on('Local/NeedsConfirmation', function(event, txp, cb) {
    self.confirmTx = {
      txp: txFormatService.processTx(txp),
      callback: function(accept) {
        self.confirmTx = null;
        return cb(accept);
      }
    };
    $timeout(function() {
      $rootScope.$apply();
    });
  });

  $rootScope.$on('Local/NeedsPassword', function(event, isSetup, cb) {
    self.askPassword = {
      isSetup: isSetup,
      callback: function(err, pass) {
        self.askPassword = null;
        return cb(err, pass);
      },
    };
    $timeout(function() {
      $rootScope.$apply();
    });
  });

  lodash.each(['NewCopayer', 'CopayerUpdated'], function(eventName) {
    $rootScope.$on(eventName, function() {
      // Re try to open wallet (will triggers)
      self.setFocusedWallet();
    });
  });

  $rootScope.$on('Local/NewEncryptionSetting', function() {
    var fc = profileService.focusedClient;
    self.isPrivKeyEncrypted = fc.isPrivKeyEncrypted();
    $timeout(function() {
      $rootScope.$apply();
    });
  });

  $rootScope.$on('Local/ThemeUpdated', function(event) {
    self.updateAll();
  });

  $rootScope.$on('Local/SkinUpdated', function(event) {
    self.updateAll();
  });

  /* Start setup */
  lodash.assign(self, vanillaScope);
});
