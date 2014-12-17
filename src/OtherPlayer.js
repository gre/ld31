var Player = require("./Player");

function OtherPlayer () {
  Player.call(this);
  this.alpha = 0.5;
}
OtherPlayer.prototype = Object.create(Player.prototype);
OtherPlayer.prototype.constructor = OtherPlayer;

module.exports = OtherPlayer;
