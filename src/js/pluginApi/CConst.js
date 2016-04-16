'use strict';
angular.module('copayApp.api').factory('CConst', function () {

  /**
   * Constructor.
   * @return {CConst} An instance of CConst.
   * @constructor
   */
  function CConst() {
    return this;
  };

  CConst.BITS_PER_BTC = 1e6;
  CConst.SATOSHI_PER_BTC = 1e8;

  return CConst;

});
