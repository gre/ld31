var PIXI = require("pixi.js");
var requestAnimFrame = require("raf");
var Spawner = require("../../src/Spawner");

function Particle () {
  PIXI.Sprite.call(this, PIXI.Texture.fromImage("./img/fireball.png"));
}
Particle.prototype = Object.create(PIXI.Sprite.prototype);
Particle.prototype.constructor = Particle;


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

[
  { spawn: spawn, pos: [50, 50], vel: 0.1, speed: 500, seq: [ 1, -1, 2, -1, 3, -1 ] },
  { spawn: spawn2, pos: [400, 200], rotate: 0.2, vel: 0.05, speed: 200, seq: [5, -4, 6, -2, 2, -8] }
].forEach(function (spawnerParams) {
  var spawner = new Spawner(spawnerParams);
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
