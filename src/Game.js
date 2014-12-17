var PIXI = require("pixi.js");

function Game (controls) {
  PIXI.DisplayObjectContainer.call(this);
};

Game.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
Game.prototype.constructor = Game;

Game.prototype.update = function (t, dt) {
};

Game.prototype.destroy = function () {
};

module.exports = Game;
