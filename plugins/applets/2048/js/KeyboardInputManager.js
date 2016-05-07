'use strict';
angular.module('copayApp.plugins').factory('KeyboardInputManager', function ($ionicGesture) {

  function KeyboardInputManager() {
    this.events = {};

    this.listen();
  }

  KeyboardInputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  };

  KeyboardInputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  };

  KeyboardInputManager.prototype.listen = function () {
    var self = this;
		var gameContainer = angular.element(document.querySelector('#gameContainer'));
		var retryButton = angular.element(document.querySelector('#retryButton'));

		$ionicGesture.on('swipeup', function(){
			self.emit("move", 0);
		}, gameContainer);

		$ionicGesture.on('swiperight', function(){
			self.emit("move", 1);
		}, gameContainer);

		$ionicGesture.on('swipedown', function(){
			self.emit("move", 2);
		}, gameContainer);

		$ionicGesture.on('swipeleft', function(){
			self.emit("move", 3);
		}, gameContainer);

		$ionicGesture.on('tap', function(){
			self.emit("restart");
		}, retryButton);
  };

  return KeyboardInputManager;
});
