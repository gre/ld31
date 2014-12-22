
var OtherPlayer = require("./OtherPlayer");
var NetworkPlayer = require("./NetworkPlayer");
var NetworkPlayerPlayback = require("./NetworkPlayerPlayback");

function NetworkGame (socket) {
  this.socket = socket;
  this.playersByIds = {};

  socket.on("playerevent", this.onPlayerEvent.bind(this));
  socket.on("playerleave", this.onPlayerLeave.bind(this));
}

NetworkGame.prototype = {
  setGame: function (game) {
    if (this.game)
      game.players = this.game.players; // Keep players from old game
    this.game = game;
    this.player = new NetworkPlayer(game.player, socket);
  },

  onPlayerEvent: function (ev, obj, id, time) {
    var p = this.playersByIds[id];
    if (!p) {
      var playerSprite = new OtherPlayer();
      playerSprite.position.x = -1000;
      p = new NetworkPlayerPlayback(playerSprite);
      this.playersByIds[id] = p;
      this.game.players.addChild(playerSprite);
    }
    p.onMessage(ev, obj, time);
  },

  onPlayerEnter: function (ev, id) {

  },

  onPlayerLeave: function (ev, id) {
    var p = this.playersByIds[id];
    if (p) {
      p.destroy();
      delete this.playersByIds[id];
    }
  },

  update: function (t, dt) {
    if (!this.game) return;
    var game = this.game;

    this.player.update(t, dt);
    for (var id in this.playersByIds) {
      this.playersByIds[id].update(t, dt);
    }
  }

};

module.exports = NetworkGame;
