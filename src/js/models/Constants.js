'use strict';

angular.module('copayApp.model').factory('Constants', function () {

   // Constructor
   // See https://medium.com/opinionated-angularjs/angular-model-objects-with-javascript-classes-2e6a067c73bc#.970bxmciz
  function Constants() {
    return this;
  };

  Constants.appletPresentationOptions = ['Categories', 'Desktop'];
  Constants.appletPresentationDefault = Constants.appletPresentationOptions[1];

  return Constants;
});