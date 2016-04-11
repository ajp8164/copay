'use strict';

angular.module('copayApp.services').factory('txHistoryService', function($rootScope, $log, $timeout, lodash, storageService, configService, txFormatService, profileService) {

  var SAFE_CONFIRMATIONS = 6;
  var SOFT_CONFIRMATION_LIMIT = 12;

  var root = {};
  root.completeHistory = [];
  root.txHistory = [];
  root.txHistorySearchResults = [];

  root.nextTxHistory;

	root.historyShowLimit = 20;
 	root.historyShowMoreLimit = 100;
  root.historyShowMore = false;

  root.updatingTxHistory;
	root.txHistoryError;
	root.newTx;
	root.txProgress;
	root.hasUnsafeConfirmed;
	root.loadingWallet;

  var historyUpdateInProgress = {};

  root.removeAndMarkSoftConfirmedTx = function(txs) {
    return lodash.filter(txs, function(tx) {
      if (tx.confirmations >= SOFT_CONFIRMATION_LIMIT)
        return tx;
      tx.recent = true;
    });
  };

  root.getSavedTxs = function(walletId, cb) {
    storageService.getTxHistory(walletId, function(err, txs) {
      if (err) return cb(err);

      var localTxs = [];

      if (!txs) {
        return cb(null, localTxs);
      }

      try {
        localTxs = JSON.parse(txs);
      } catch (ex) {
        $log.warn(ex);
      }
      return cb(null, lodash.compact(localTxs));
    });
  };

  root.setCompactTxHistory = function() {
    root.nextTxHistory = root.historyShowMoreLimit;
    root.txHistory = root.completeHistory ? root.completeHistory.slice(0, root.historyShowLimit) : null;
    root.txHistorySearchResults = root.txHistory;
    root.historyShowMore = root.completeHistory ? root.completeHistory.length > root.historyShowLimit : null;
  };

  root.showMore = function() {
    root.txHistory = root.completeHistory.slice(0, root.nextTxHistory);
    root.txHistorySearchResults = root.txHistory;
    $log.debug('Total txs: ', root.txHistorySearchResults.length + '/' + root.completeHistory.length);
    if (root.txHistorySearchResults.length >= root.completeHistory.length) {
      root.historyShowMore = false;
    }
    root.nextTxHistory += root.historyShowMoreLimit;
  };

  root.updateLocalTxHistory = function(client, cb) {
    var FIRST_LIMIT = 5;
    var LIMIT = 50;
    var requestLimit = FIRST_LIMIT;
    var walletId = client.credentials.walletId;
    var config = configService.getSync().wallet.settings;

    var fixTxsUnit = function(txs) {
      if (!txs || !txs[0] || !txs[0].amountStr) return;

      var cacheUnit = txs[0].amountStr.split(' ')[1];

      if (cacheUnit == config.unitName)
        return;

      var name = ' ' + config.unitName;

      $log.debug('Fixing Tx Cache Unit to:' + name)
      lodash.each(txs, function(tx) {

        tx.amountStr = txFormatService.formatAmount(tx.amount, config.unitName) + name;
        tx.feeStr = txFormatService.formatAmount(tx.fees, config.unitName) + name;
      });
    };

    root.getSavedTxs(walletId, function(err, txsFromLocal) {
      if (err) return cb(err);

      fixTxsUnit(txsFromLocal);

      var confirmedTxs = root.removeAndMarkSoftConfirmedTx(txsFromLocal);
      var endingTxid = confirmedTxs[0] ? confirmedTxs[0].txid : null;


      // First update
      if (walletId == profileService.focusedClient.credentials.walletId) {
        root.completeHistory = txsFromLocal;
        root.setCompactTxHistory();
      }

      if (historyUpdateInProgress[walletId])
        return;

      historyUpdateInProgress[walletId] = true;

      function getNewTxs(newTxs, skip, i_cb) {
        root.getTxsFromServer(client, skip, endingTxid, requestLimit, function(err, res, shouldContinue) {
          if (err) return i_cb(err);

          newTxs = newTxs.concat(lodash.compact(res));
          skip = skip + requestLimit;

          $log.debug('Syncing TXs. Got:' + newTxs.length + ' Skip:' + skip, ' EndingTxid:', endingTxid, ' Continue:', shouldContinue);

          if (!shouldContinue) {
            newTxs = root.processNewTxs(newTxs);
            $log.debug('Finished Sync: New / soft confirmed Txs: ' + newTxs.length);
            return i_cb(null, newTxs);
          }

          requestLimit = LIMIT;
          getNewTxs(newTxs, skip, i_cb);

          // Progress update
          if (walletId == profileService.focusedClient.credentials.walletId) {
            root.txProgress = newTxs.length;
            if (root.completeHistory < FIRST_LIMIT && txsFromLocal.length == 0) {
              $log.debug('Showing partial history');
              var newHistory = root.processNewTxs(newTxs);
              newHistory = lodash.compact(newHistory.concat(confirmedTxs));
              root.completeHistory = newHistory;
              root.setCompactTxHistory();
            }
            $timeout(function() {
              $rootScope.$apply();
            });
          }
        });
      };

      getNewTxs([], 0, function(err, txs) {
        if (err) return cb(err);

        var newHistory = lodash.uniq(lodash.compact(txs.concat(confirmedTxs)), function(x) {
          return x.txid;
        });
        var historyToSave = JSON.stringify(newHistory);

        lodash.each(txs, function(tx) {
          tx.recent = true;
        })

        $log.debug('Tx History synced. Total Txs: ' + newHistory.length);

        // Final update
        if (walletId == profileService.focusedClient.credentials.walletId) {
          root.completeHistory = newHistory;
          root.setCompactTxHistory();
        }

        return storageService.setTxHistory(historyToSave, walletId, function() {
          $log.debug('Tx History saved.');

          return cb();
        });
      });
    });
  };

  root.processNewTxs = function(txs) {
    var config = configService.getSync().wallet.settings;
    var now = Math.floor(Date.now() / 1000);
    var txHistoryUnique = {};
    var ret = [];
    root.hasUnsafeConfirmed = false;

    lodash.each(txs, function(tx) {
      tx = txFormatService.processTx(tx);

      // no future transactions...
      if (tx.time > now)
        tx.time = now;

      if (tx.confirmations >= SAFE_CONFIRMATIONS) {
        tx.safeConfirmed = SAFE_CONFIRMATIONS + '+';
      } else {
        tx.safeConfirmed = false;
        root.hasUnsafeConfirmed = true;
      }

      if (!txHistoryUnique[tx.txid]) {
        ret.push(tx);
        txHistoryUnique[tx.txid] = true;
      } else {
        $log.debug('Ignoring duplicate TX in history: ' + tx.txid)
      }
    });

    return ret;
  };

  root.getTxsFromServer = function(client, skip, endingTxid, limit, cb) {
    var res = [];

    client.getTxHistory({
      skip: skip,
      limit: limit
    }, function(err, txsFromServer) {
      if (err) return cb(err);

      if (!txsFromServer.length)
        return cb();

      var res = lodash.takeWhile(txsFromServer, function(tx) {
        return tx.txid != endingTxid;
      });

      return cb(null, res, res.length == limit);
    });
  };

  root.updateHistory = function() {
    var fc = profileService.focusedClient;
    if (!fc) return;
    var walletId = fc.credentials.walletId;

    if (!fc.isComplete()) {
      return;
    }

    $log.debug('Updating Transaction History');
    root.txHistoryError = false;
    root.updatingTxHistory = true;

    $timeout(function() {
      root.updateLocalTxHistory(fc, function(err) {
        historyUpdateInProgress[walletId] = root.updatingTxHistory = false;
        root.loadingWallet = false; // TODO
        root.txProgress = 0;
        if (err)
          root.txHistoryError = true;

        $timeout(function() {
          root.newTx = false
        }, 1000);

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

  root.handleError = lodash.debounce(_handleError, 1000);

  root.csvHistory = function() {

    function saveFile(name, data) {
      var chooser = document.querySelector(name);
      chooser.addEventListener("change", function(evt) {
        var fs = require('fs');
        fs.writeFile(this.value, data, function(err) {
          if (err) {
            $log.debug(err);
          }
        });
      }, false);
      chooser.click();
    }

    function formatDate(date) {
      var dateObj = new Date(date);
      if (!dateObj) {
        $log.debug('Error formating a date');
        return 'DateError'
      }
      if (!dateObj.toJSON()) {
        return '';
      }

      return dateObj.toJSON();
    }

    function formatString(str) {
      if (!str) return '';

      if (str.indexOf('"') !== -1) {
        //replace all
        str = str.replace(new RegExp('"', 'g'), '\'');
      }

      //escaping commas
      str = '\"' + str + '\"';

      return str;
    }

    var step = 6;
    var unique = {};

    function getHistory(cb) {
      storageService.getTxHistory(c.walletId, function(err, txs) {
        if (err) return cb(err);

        var txsFromLocal = [];
        try {
          txsFromLocal = JSON.parse(txs);
        } catch (ex) {
          $log.warn(ex);
        }

        allTxs.push(txsFromLocal);
        return cb(null, lodash.flatten(allTxs));
      });
    }

    if (isCordova) {
      $log.info('CSV generation not available in mobile');
      return;
    }
    var isNode = nodeWebkit.isDefined();
    var fc = profileService.focusedClient;
    var c = fc.credentials;
    if (!fc.isComplete()) return;
    var self = this;
    var allTxs = [];

    $log.debug('Generating CSV from History');
//    self.setOngoingProcess('generatingCSV', true);

    getHistory(function(err, txs) {
//      self.setOngoingProcess('generatingCSV', false);
      if (err) {
        root.handleError(err);
      } else {
        $log.debug('Wallet Transaction History:', txs);

        self.satToUnit = 1 / self.unitToSatoshi;
        var data = txs;
        var satToBtc = 1 / 100000000;
        self.csvContent = [];
        self.csvFilename = 'Copay-' + (self.alias || self.walletName) + '.csv';
        self.csvHeader = ['Date', 'Destination', 'Note', 'Amount', 'Currency', 'Txid', 'Creator', 'Copayers'];

        var _amount, _note, _copayers, _creator;
        data.forEach(function(it, index) {
          var amount = it.amount;

          if (it.action == 'moved')
            amount = 0;

          _copayers = '';
          _creator = '';

          if (it.actions && it.actions.length > 1) {
            for (var i = 0; i < it.actions.length; i++) {
              _copayers += it.actions[i].copayerName + ':' + it.actions[i].type + ' - ';
            }
            _creator = (it.creatorName && it.creatorName != 'undefined') ? it.creatorName : '';
          }
          _copayers = formatString(_copayers);
          _creator = formatString(_creator);
          _amount = (it.action == 'sent' ? '-' : '') + (amount * satToBtc).toFixed(8);
          _note = formatString((it.message ? it.message : ''));

          if (it.action == 'moved')
            _note += ' Moved:' + (it.amount * satToBtc).toFixed(8)

          self.csvContent.push({
            'Date': formatDate(it.time * 1000),
            'Destination': formatString(it.addressTo),
            'Note': _note,
            'Amount': _amount,
            'Currency': 'BTC',
            'Txid': it.txid,
            'Creator': _creator,
            'Copayers': _copayers
          });

          if (it.fees && (it.action == 'moved' || it.action == 'sent')) {
            var _fee = (it.fees * satToBtc).toFixed(8)
            self.csvContent.push({
              'Date': formatDate(it.time * 1000),
              'Destination': 'Bitcoin Network Fees',
              'Note': '',
              'Amount': '-' + _fee,
              'Currency': 'BTC',
              'Txid': '',
              'Creator': '',
              'Copayers': ''
            });
          }
        });
        return;
      }
    });
  };

  return root;
});