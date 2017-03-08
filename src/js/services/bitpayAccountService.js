'use strict';

angular.module('copayApp.services').factory('bitpayAccountService', function($log, lodash, platformInfo, appIdentityService, bitpayService, bitpayCardService, storageService, gettextCatalog, popupService, externalLinkService) {

  var root = {};
  var BITPAY_ACCOUNT_START_URL = 'https://bitpay.com/visa/dashboard/add-to-bitpay-wallet-confirm';

  // A list of reasons why bitpay account pairing is being requested. The reason faciliates this apps
  // response when the pairing data is received from the server so that the user is automatically put
  // into the correct context for completing the desired function (see incomingData service).
  var pairFor = {
    card: {
      id: 'card',
      text: 'add your BitPay Visa<sup>&reg;</sup> card(s)'
    },
    payroll: {
      id: 'payroll',
      text: 'start payroll deduction for receiving bitcoin deposits'
    }
  };

  var pairingReason = undefined;

  root.getPairingReason = function() {
    return pairingReason;
  };

  root.startPairBitPayAccount = function(reasonId) {
    if (!reasonId || !pairFor[reasonId]) {
      return $log.error('Started account pairing failed, unknown reasonId: ' + reasonId);
    }
    pairingReason = pairFor[reasonId];
    var url = BITPAY_ACCOUNT_START_URL;
    externalLinkService.open(url);          
    $log.info('Started account pairing process for ' + pairingReason.id);
  };

  /*
   * Pair this app with the bitpay server using the specified pairing data.
   * An app identity will be created if one does not already exist.
   * Pairing data is provided by an input URI provided by the bitpay server.
   *
   * pairData - data needed to complete the pairing process
   * {
   *   secret: shared pairing secret
   *   email: email address associated with bitpay account
   *   otp: two-factor one-time use password
   * }
   * 
   * cb - callback after completion
   *   callback(err, paired, apiContext)
   *
   *   err - something unexpected happened which prevented the pairing
   * 
   *   paired - boolean indicating whether the pairing was compledted by the user
   * 
   *   apiContext - the context needed for making future api calls
   *   {
   *     token: api token for use in future calls
   *     pairData: the input pair data
   *     appIdentity: the identity of this app
   *   }
   */
  root.pair = function(pairData, cb) {
    checkOtp(pairData, function(otp) {
      pairData.otp = otp;
	    var deviceName = 'Unknown device';
	    if (platformInfo.isNW) {
	      deviceName = require('os').platform();
	    } else if (platformInfo.isCordova) {
	      deviceName = device.model;
	    }
	    var json = {
	      method: 'createToken',
	      params: {
	        secret: pairData.secret,
	        version: 2,
	        deviceName: deviceName,
	        code: pairData.otp
	      }
	    };

      bitpayService.postAuth(json, function(data) {
        if (data && data.data.error) {
          return cb(data.data.error);
        }
        var apiContext = {
          token: data.data.data,
          pairData: pairData,
          appIdentity: data.appIdentity
        };
        $log.info('BitPay service BitAuth create token: SUCCESS');

        fetchBasicInfo(apiContext, function(err, basicInfo) {
          if (err) return cb(err);
          var title = gettextCatalog.getString('Add BitPay Account?');
          var msgDetail = 'Add this BitPay account ({{email}})?';
          if (pairingReason) {
  	        msgDetail = 'To {{reason}} you must first add your BitPay account - {{email}}';
  	      }
          var msg = gettextCatalog.getString(msgDetail, {
          	reason: pairingReason.text,
            email: pairData.email
          });
          var ok = gettextCatalog.getString('Add Account');
          var cancel = gettextCatalog.getString('Go back');
          popupService.showConfirm(title, msg, ok, cancel, function(res) {
          	if (res) {
  		        var acctData = {
                token: apiContext.token,
                email: pairData.email,
                givenName: basicInfo.givenName,
                familyName: basicInfo.familyName
              };
  						setAccount(acctData, function(err) {
  			        return cb(err, true, apiContext);
  						});
          	} else {
  				    $log.info('User cancelled BitPay pairing process');
  		        return cb(null, false);
          	}
          });
        });
      }, function(data) {
        return cb(_setError('BitPay service BitAuth create token: ERROR ', data));
	    });
	  });
  };

  var checkOtp = function(pairData, cb) {
    if (pairData.otp) {
      var msg = gettextCatalog.getString('Enter Two Factor for your BitPay account');
      popupService.showPrompt(null, msg, null, function(res) {
        cb(res);
      });
    } else {
      cb();
    }
  };

  var fetchBasicInfo = function(apiContext, cb) {
    var json = {
      method: 'getBasicInfo'
    };
    // Get basic account information
    bitpayService.post(apiContext.token, json, function(data) {
      if (data && data.data.error) return cb(data.data.error);
      $log.info('BitPay Account Get Basic Info: SUCCESS');
      return cb(null, data.data.data);
    }, function(data) {
      return cb(_setError('BitPay Account Error: Get Basic Info', data));
    });
  };

  // Returns account objects as stored.
  root.getAccountsAsStored = function(cb) {
    storageService.getBitpayAccounts(bitpayService.getEnvironment().network, cb);
  };

  // Returns an array where each element represents an account including all information required for fetching data
  // from the server for each account (apiContext).
  root.getAccounts = function(cb) {
    root.getAccountsAsStored(function(err, accounts) {
      if (err || lodash.isEmpty(accounts)) {
        return cb(err, []);
      }
      appIdentityService.getIdentity(bitpayService.getEnvironment().network, function(err, appIdentity) {
        if (err) {
          return cb(err);
        }

        var accountsArray = [];
        lodash.forEach(Object.keys(accounts), function(key) {
          accounts[key].cards = accounts[key].cards;
          accounts[key].email = key;
          accounts[key].givenName = accounts[key].givenName || '';
          accounts[key].familyName = accounts[key].familyName || '';
          accounts[key].apiContext = {
            token: accounts[key].token,
            pairData: {
              email: key
            },
            appIdentity: appIdentity
          };

          accountsArray.push(accounts[key]);
        });
        return cb(null, accountsArray);
      });
    });
  };

  // Convenience function returns the specified account.
  root.getAccount = function(email, cb) {
    root.getAccounts(function(err, accounts) {
      if (err) {
        return cb(err);
      }
      var account = lodash.find(accounts, function(account) {
        return account.email == email;
      });
      if (!account) {
        cb('Account not found: ' + email);
      } else {
        cb(null, account);
      }
    });
  };

  var setAccount = function(account, cb) {
    storageService.setBitpayAccount(bitpayService.getEnvironment().network, account, function(err) {
      return cb(err);
    });
  };

  root.removeAccount = function(account, cb) {
    storageService.removeBitpayAccount(bitpayService.getEnvironment().network, account, function(err) {
      bitpayCardService.registerNextStep();
      cb(err);
    });
  };

  var _setError = function(msg, e) {
    $log.error(msg);
    var error = (e && e.data && e.data.error) ? e.data.error : msg;
    return error;
  };

  return root;
  
});
