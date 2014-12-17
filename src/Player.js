var PIXI = require("pixi.js");

var spriteCollides = require("./utils/spriteCollides");
var audio = require("./audio");
var Foot = require("./Foot");
var conf = require("./conf");

var playerTexture = PIXI.Texture.fromImage("/img/player.png");
var playerWalkTextures = [
  PIXI.Texture.fromImage("/img/player1.png"),
  playerTexture,
  PIXI.Texture.fromImage("/img/player2.png")
];
function Player (footprintsContainer) {
  this.footprints = footprintsContainer;
  PIXI.Sprite.call(this, playerTexture);
  this.life = 100;
  this.pivot.set(80, 80);
}
Player.prototype = Object.create(PIXI.Sprite.prototype);
Player.prototype.constructor = Player;
Player.prototype.update = function (t, dt) {
  if (this.dead) return;
  var x = this.controls.x();
  var y = this.controls.y();

  this.position.x += 0.2 * x * dt;
  this.position.y -= 0.2 * y * dt;

  this.maxProgress = Math.min(this.maxProgress, this.position.y);

  this.position.x = Math.max(0, Math.min(this.position.x, conf.WIDTH));
  this.position.y = Math.min(this.position.y, this.maxProgress+120);

  var scale = 0.6 + this.life / 150;
  this.width  = 40 * scale;
  this.height = 40 * scale;

  if (x || y) {
    if (this.footprints && Math.random()<0.8)
      this.footprints.addChild(new Foot(this.position));
    this.setTexture(playerWalkTextures[~~(t / 150) % playerWalkTextures.length]);
  }
  else {
    this.setTexture(playerTexture);
  }

  if (y < 0) this.rotation = Math.PI;
  else if (y > 0) this.rotation = 0;
  else if (x > 0) this.rotation = Math.PI/2;
  else if (x < 0) this.rotation = -Math.PI/2;
};
Player.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x * this.scale.x + this.width * 0.25,
    y: this.y - this.pivot.y * this.scale.y + this.height * 0.2,
    width: this.width * 0.5,
    height: this.height * 0.6
  };
};
Player.prototype.onProjectile = function (p) {
  var knock = 2 * p.width;
  this.position.x += knock * p.vel[0];
  this.position.y += knock * p.vel[1];
};
Player.prototype.onSnowball = function (ball) {
  this.life += 10;
  this.onProjectile(ball);
};
Player.prototype.onFireball = function (ball) {
  this.life -= 10;
  this.onProjectile(ball);
};
Player.prototype.onCarHit = function () {
  // this.life -= 100; // FIXME new gameplay to consider later
  this.life = 0;
  audio.play("carHit", null, 1.0);
};
Player.prototype.collidesCar = function (car) {
  return collideRectangle(this, car);
};
Player.prototype.collidesParticle = function (p) {
  return collideRectangle(this, p);
};
Player.prototype.collides = spriteCollides;
Player.prototype.getScore = function () {
 return {
   player: Player.getPlayerName(),
   x: ~~this.position.x,
   score: Player.getPlayerScore(this)
 };
};

Player.getPlayerScore = function (player) {
  return ~~Math.max(0, -player.maxProgress);
};

Player.getPlayerName = function () {
  var name = window.localStorage.player || prompt("What's your name? (3 to 10 alphanum characters)");
  if (!name) return null;
  if (! /^[a-zA-Z0-9]{3,10}$/.exec(name)) return Player.getPlayerName();
  return window.localStorage.player = name;
};

module.exports = Player;
