'use strict';

angular.module('copayApp.controllers').controller('txpDetailsController', function($rootScope, $scope, $timeout, lodash, bwsError, gettextCatalog, profileService, txService, txFormatService) {

	var self = $scope.self;
  var fc = profileService.focusedClient;
  var now = Math.floor(Date.now() / 1000);

  $scope.paymentExpired = null;
  checkPaypro();
  $scope.error = null;
  $scope.copayerId = fc.credentials.copayerId;
  $scope.canSign = fc.canSign() || fc.isPrivKeyExternal();
  $scope.loading = null;
  $scope.isShared = fc.credentials.n > 1;
  $scope.tx = self.tx;

  // ToDo: use tx.customData instead of tx.message
  if (self.tx.message === 'Glidera transaction' && self.isGlidera) {
    self.tx.isGlidera = true;
    if (self.tx.canBeRemoved) {
      self.tx.canBeRemoved = (Date.now() / 1000 - (self.tx.ts || self.tx.createdOn)) > GLIDERA_LOCK_TIME;
    }
  }

  $scope.getShortNetworkName = function() {
    return fc.credentials.networkName.substring(0, 4);
  };

  function checkPaypro() {
    if (self.tx.payProUrl && !isChromeApp) {
      fc.fetchPayPro({
        payProUrl: self.tx.payProUrl,
      }, function(err, paypro) {
        if (err) return;
        self.tx.paypro = paypro;
        paymentTimeControl(self.tx.paypro.expires);
      });
    }
  };

  function paymentTimeControl(expirationTime) {
    $scope.paymentExpired = false;
    var countDown;
    setExpirationTime();
    countDown = $interval(function() {
      setExpirationTime();
    }, 1000);

    function setExpirationTime() {
      if (moment().isAfter(expirationTime * 1000)) {
        $scope.paymentExpired = true;
        if (countDown) $interval.cancel(countDown);
      }
      $scope.expires = moment(expirationTime * 1000).fromNow();
    };
  };
  
  lodash.each(['TxProposalRejectedBy', 'TxProposalAcceptedBy', 'transactionProposalRemoved', 'TxProposalRemoved', 'NewOutgoingTx', 'UpdateTx'], function(eventName) {
    $rootScope.$on(eventName, function() {
      fc.getTx(self.tx.id, function(err, tx) {
        if (err) {

          if (err.message && err.message == 'TX_NOT_FOUND' &&
            (eventName == 'transactionProposalRemoved' || eventName == 'TxProposalRemoved')) {
            self.tx.removed = true;
            self.tx.canBeRemoved = false;
            self.tx.pendingForUs = false;
            $scope.$apply();
            return;
          }
          return;
        }

        var action = lodash.find(tx.actions, {
          copayerId: fc.credentials.copayerId
        });
        self.tx = txFormatService.processTx(tx);
        if (!action && tx.status == 'pending')
          self.tx.pendingForUs = true;
        $scope.updateCopayerList();
        $scope.$apply();
      });
    });
  });

  $scope.updateCopayerList = function() {
    lodash.map(self.copayers, function(cp) {
      lodash.each(self.tx.actions, function(ac) {
        if (cp.id == ac.copayerId) {
          cp.action = ac.type;
        }
      });
    });
  };

  $scope.sign = function(txp) {
    var fc = profileService.focusedClient;
    $scope.error = null;
    $scope.loading = true;

    txService.prepareAndSignAndBroadcast(txp, {
      reporterFn: self.setOngoingProcess.bind(self)
    }, function(err, txp) {
      $scope.loading = false;
      $scope.$emit('UpdateTx');
      
      if (err) {
        $scope.error = err;
        $timeout(function() {
          $scope.$digest();
        });
        return;
      }
      $modalInstance.close(txp);
      return;
    });
  };

  $scope.reject = function(txp) {
    self.setOngoingProcess(gettextCatalog.getString('Rejecting payment'));
    $scope.loading = true;
    $scope.error = null;
    $timeout(function() {
      fc.rejectTxProposal(txp, null, function(err, txpr) {
        self.setOngoingProcess();
        $scope.loading = false;
        if (err) {
          $scope.$emit('UpdateTx');
          $scope.error = bwsError.msg(err, gettextCatalog.getString('Could not reject payment'));
          $scope.$digest();
        } else {
          $scope.close(txpr);
        }
      });
    }, 100);
  };


  $scope.remove = function(txp) {
    self.setOngoingProcess(gettextCatalog.getString('Deleting payment'));
    $scope.loading = true;
    $scope.error = null;
    $timeout(function() {
      fc.removeTxProposal(txp, function(err, txpb) {
        self.setOngoingProcess();
        $scope.loading = false;

        // Hacky: request tries to parse an empty response
        if (err && !(err.message && err.message.match(/Unexpected/))) {
          $scope.$emit('UpdateTx');
          $scope.error = bwsError.msg(err, gettextCatalog.getString('Could not delete payment proposal'));
          $scope.$digest();
          return;
        }
        $scope.close();
      });
    }, 100);
  };

  $scope.broadcast = function(txp) {
    self.setOngoingProcess(gettextCatalog.getString('Broadcasting Payment'));
    $scope.loading = true;
    $scope.error = null;
    $timeout(function() {
      fc.broadcastTxProposal(txp, function(err, txpb, memo) {
        self.setOngoingProcess();
        $scope.loading = false;
        if (err) {
          $scope.error = bwsError.msg(err, gettextCatalog.getString('Could not broadcast payment'));
          $scope.$digest();
        } else {

          if (memo)
            $log.info(memo);

          $scope.close(txpb);
        }
      });
    }, 100);
  };

  $scope.copyToClipboard = function(addr) {
    if (!addr) return;
    self.copyToClipboard(addr);
  };

  $scope.close = function(txp) {
    var fc = profileService.focusedClient;
    self.setOngoingProcess();
    if (txp) {
      txStatus.notify($scope, fc, txp, function() {
        $scope.$emit('Local/TxProposalAction', txp.status == 'broadcasted');        
      });
    } else {
      $timeout(function() {
        $scope.$emit('Local/TxProposalAction');
      }, 100);
    }
    $scope.cancel();
  };

  $scope.cancel = function() {
    $scope.txpDetailsModal.hide();
    $scope.txpDetailsModal.remove();
  };

});