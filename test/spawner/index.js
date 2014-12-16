var PIXI = require("pixi.js");
var requestAnimFrame = require("raf");
var Spawner = require("../../src/Spawner");

function collideRectangle (r1, r2) {
  return !(r2.x > (r1.x + r1.width) ||
      (r2.x + r2.width) < r1.x ||
      r2.y > (r1.y + r1.height) ||
      (r2.y + r2.height) < r1.y);
}
function spriteCollides (sprite) {
  return collideRectangle(this.hitBox(), sprite.hitBox ? sprite.hitBox() : sprite) ? this : null;
}

function Particle () {
  PIXI.Sprite.call(this, PIXI.Texture.fromImage("./img/fireball.png"));
}
Particle.prototype = Object.create(PIXI.Sprite.prototype);
Particle.prototype.constructor = Particle;
Particle.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x * this.scale.x,
    y: this.y - this.pivot.y * this.scale.y,
    width: this.width,
    height: this.height
  };
};
Particle.prototype.collides = spriteCollides;

var renderer = PIXI.autoDetectRenderer(800, 400);
document.body.appendChild(renderer.view);

var stage = new PIXI.Stage(0xFFFFFF);

var spawners = new PIXI.DisplayObjectContainer();
stage.addChild(spawners);

function spawn (i) {
  return new Particle();
}
function spawn2 (i) {
  var p = new Particle();
  p.width = p.height = 20;
  return p;
}

var viewport = { x: 0, y: 0, width: 800, height: 400 };

[
  { spawn: spawn, pos: [50, 50], vel: 0.1, speed: 500, seq: [ 1, -1, 2, -1, 3, -1 ] },
  { spawn: spawn2, pos: [400, 200], rotate: 0.2, vel: 0.05, speed: 200, seq: [5, -4, 6, -2, 2, -8], life: 60000, livingBound: viewport }
].forEach(function (spawnerParams) {
  var spawner = new Spawner(spawnerParams);
  spawner.init(Date.now()-5000);
  spawners.addChild(spawner);
})

var lastT;

function loop () {
  requestAnimFrame(loop);

  var t = Date.now();
  var dt = t - lastT;
  lastT = t;

  spawners.children.forEach(function (spawner) {
    spawner.update(t, dt);
  });

  renderer.render(stage);
}

requestAnimFrame(loop);
