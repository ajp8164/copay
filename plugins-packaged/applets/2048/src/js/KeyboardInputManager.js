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
    var options = {
      threshold: 10,
      velocity: 0.3
    };

		$ionicGesture.on('swipeup', function(){
			self.emit("move", 0);
		}, gameContainer, options);

		$ionicGesture.on('swiperight', function(){
			self.emit("move", 1);
		}, gameContainer, options);

		$ionicGesture.on('swipedown', function(){
			self.emit("move", 2);
		}, gameContainer, options);

		$ionicGesture.on('swipeleft', function(){
			self.emit("move", 3);
		}, gameContainer, options);

		$ionicGesture.on('tap', function(){
			self.emit("restart");
		}, retryButton);
  };

  return KeyboardInputManager;
});
