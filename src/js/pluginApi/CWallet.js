'use strict';
angular.module('copayApp.api').factory('CWallet', function (configService, txFormatService, FocusedWallet) {

  /**
   * Constructor.
   * @return {Object} An instance of CWallet.
   * @constructor
   */
  function CWallet() {
    return this;
  };

  /**
   * Return the current wallet currency unit name.
   * @return {String} A currency unit name.
   * @static
   */
  CWallet.getCurrencyName = function() {
    return configService.getSync().wallet.settings.unitName;
  };

  /**
   * Return the current wallet currency code.
   * @return {String} A currency code.
   * @static
   */
  CWallet.getCurrencyCode = function() {
    return configService.getSync().wallet.settings.unitCode;
  };

  /**
   * Return the current wallet alternative currency unit name.
   * @return {String} A currency name.
   * @static
   */
  CWallet.getAltCurrencyName = function() {
    return configService.getSync().wallet.settings.alternativeName;
  };

  /**
   * Return the current wallet alternative currency unit ISO code.
   * @return {String} An ISO code.
   * @static
   */
  CWallet.getAltCurrencyIsoCode = function() {
    return configService.getSync().wallet.settings.alternativeIsoCode;
  };

  /**
   * Return the current wallet conversion for unit to satoshi.
   * @return {Number} A unit to satoshi conversion number.
   * @static
   */
  CWallet.getUnitToSatoshi = function() {
    return configService.getSync().wallet.settings.unitToSatoshi;
  };

  /**
   * Return the current wallet unit number of decimal places.
   * @return {Number} A number of decimal places.
   * @static
   */
  CWallet.getUnitDecimals = function() {
    return configService.getSync().wallet.settings.unitDecimals;
  };

  /**
   * Return the formatted amount for display using the current wallet settings.
   * @return {String} A formatted currency amount.
   * @static
   */
  CWallet.formatAmount = function(amount) {
    return txFormatService.formatAmount(amount);
  };

  /**
   * Callback for sendPayment().
   * @callback {sendPaymentCallback}
   * @param {String|undefined} error - An error message or undefined.
   */

  /**
   * Sends a bitcoin payment from the current wallet.
   * This method presents a user interface confirmation prior to sending payment.
   *
   * {payproData} - For payment-protocol payments provide the following payment data object.
   * 
   * data: {
   *   {String} payProUrl - The full payment protocol service URL.
   *   {String} memo - A human readbale memo attached to the payment.
   * }
   * 
   * {paymentData} - For all other payments provide the following payment data object.
   *   
   * data: {
   *   {String} toAddress - A bitcoin destination address.
   *   {Number} amount - The number of satoshi's to send.
   *   {String} memo - A human readbale memo attached to the payment.
   * }
   *
   * @param {payproData|paymentData} data - The payment data.
   * @param {sendPaymentCallback} callback - A callback on completion.
   * @static
   */
  CWallet.sendPayment = function(data, callback) {
    return FocusedWallet.sendPayment(data, callback);
  };

  return CWallet;
});
