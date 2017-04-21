'use strict';

angular.module('copayApp.controllers').controller('payrollTransactionsController', function($scope, $timeout, $log, $state, lodash, ongoingProcess, bitpayPayrollService, popupService, gettextCatalog, configService) {

  var config = configService.getSync().wallet.settings;

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    if (data.stateParams && data.stateParams.id) {
      bitpayPayrollService.getPayrollRecordById(data.stateParams.id, function(err, record) {
        if (err) {
          return showError(err);
        }

        if (!record) {
          return showError(
            'No payroll record found when loading payrollTransactionsController',
            gettextCatalog.getString('Error'),
            gettextCatalog.getString('No payroll settings specified.'));
        }

        $scope.payrollRecord = record;
        $scope.dateRange = {
          value: 'last30Days'
        };

        // Try to cache transactions from server.
        $scope.hasTransactions = false;
        $scope.update(function(updateErr) {
  /*
          if (updateErr) {
            // Try to get cached transactions.
            updateTransactionsFromCache(function(cacheErr) {
              if (!$scope.transactions && updateErr) {
                showError(updateErr);
              }
            });
          }
  */
        });
      });
    } else {
      return showError(
        'No payroll record id specified when loading payrollTransactionsController',
        gettextCatalog.getString('Error'),
        gettextCatalog.getString('No payroll settings specified.'));
    }
  });

  $scope.formatRate = function(rate) {
    var str = '';
    if (config.unitName == 'bits') {
      str = '1,000,000 bits = ' + rate + ' ' + config.alternativeIsoCode;
    } else {
      str = '1 BTC = ' + rate + ' ' + config.alternativeIsoCode;
    }
    return str;
  };

  $scope.update = function(cb) {
    var dateRange = setDateRange($scope.dateRange.value);

    ongoingProcess.set('loadingTxInfo', true);
    bitpayPayrollService.getPayrollTransactions($scope.payrollRecord, dateRange, function(err, txData) {
      ongoingProcess.set('loadingTxInfo', false);
      if (err) {
        return showError(err);        
      }
      $scope.transactions = txData.transactionList;
      $scope.hasTransactions = $scope.transactions.length > 0;
      cb(err);
    });
  };

  var updateFromCache = function(cb) {
    bitpayPayrollService.getPayrollRecordTransactions($scope.payrollRecord, function(err, txData) {
      $scope.transactions = txData.transactionList;
      return cb(err);
    });
  };

  var setDateRange = function(preset) {
    var startDate, endDate;
    preset = preset ||  'last30Days';
    switch (preset) {
      case 'last30Days':
        startDate = moment().subtract(30, 'days').toISOString();
        endDate = moment().toISOString();
        break;
      case 'lastMonth':
        startDate = moment().startOf('month').subtract(1, 'month').toISOString();
        endDate = moment().startOf('month').toISOString();
        break;
      case 'all':
        startDate = null;
        endDate = null;
        break;
      default:
        return;
    }
    return {
      startDate: startDate,
      endDate: endDate
    };
  };

  function showError(err, title, message) {
    var title = title || gettextCatalog.getString('Error');
    var message = message || gettextCatalog.getString('Could not get payroll transactions.');
    $log.error(err);
    return popupService.showAlert(title, message);
  };

});
