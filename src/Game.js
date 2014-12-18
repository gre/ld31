var PIXI = require("pixi.js");
var smoothstep = require("smoothstep");

var dist = require("./utils/dist");
var mix = require("./utils/mix");

var audio = require("./audio");
var network = require("./network");
var conf = require("./conf");
var font = require("./font");

var World = require("./World");
var Map = require("./Map");
var DeadCarrot = require("./DeadCarrot");
var Player = require("./Player");
var KeyboardControls = require("./KeyboardControls");
var SpawnerCollection = require("./SpawnerCollection");

var findChildrenCollide = require("./behavior/findChildrenCollide");
var updateChildren = require("./behavior/updateChildren");
var velUpdate = require("./behavior/velUpdate");

function Game (seed, controls) {
  PIXI.Stage.call(this);

  var world = new World();
  var cars = new SpawnerCollection();
  var particles = new SpawnerCollection();
  var map = new Map(seed, cars, particles);
  var deadCarrots = new PIXI.DisplayObjectContainer();
  var footprints = new PIXI.DisplayObjectContainer();
  var player = new Player(footprints);
  player.controls = controls;
  player.position.x = conf.WIDTH / 2;
  player.position.y = conf.HEIGHT - 30;
  player.maxProgress = conf.HEIGHT - 120;
  var players = new PIXI.DisplayObjectContainer();
  var ui = new PIXI.DisplayObjectContainer();
  var score = new PIXI.Text("", { font: 'bold 20px '+font.name, fill: '#88B' });
  score.position.x = 10;
  score.position.y = 10;
  var life = new PIXI.Text("");
  life.position.x = conf.WIDTH - 60;
  life.position.y = 10;

  world.addChild(map);
  world.addChild(footprints);
  world.addChild(deadCarrots);
  world.addChild(players);
  world.addChild(player);
  world.addChild(cars);
  world.addChild(particles);

  ui.addChild(score);
  ui.addChild(life);

  this.addChild(world);
  this.addChild(ui);

  this.world = world;
  this.map = map;
  this.cars = cars;
  this.particles = particles;
  this.deadCarrots = deadCarrots;
  this.footprints = footprints;
  this.player = player;
  this.players = players;
  this.ui = ui;
  this.score = score;
  this.life = life;
  this.controls = controls;

  // Game states
  this.audio1 = audio.loop("/audio/1.ogg");
  this.currentAlloc = -1;
};

Game.prototype = Object.create(PIXI.Stage.prototype);
Game.prototype.constructor = Game;

Game.prototype.update = function (t, dt) {
  var world = this.world;
  var player = this.player;
  var cars = this.cars;
  var particles = this.particles;
  var controls = this.controls;

  // general vars for this loop time
  var danger = 0;

  // Handle cars and collision with particles
  var carNearby = 0;
  cars.children.forEach(function (spawner) {
    spawner.children.forEach(function (car) {
      var particle = particles.collides(car);
      if (particle) {
        particle.explodeInWorld(world);
        particle.parent.removeChild(particle);
      }
      var d = dist(car, player);
      danger += Math.pow(smoothstep(300, 50, d), 2);
      if (!car.neverSaw && d < 220) {
        car.neverSaw = 1;
        carNearby ++;
      }
    });
  });
  if (carNearby) {
    audio.play("car");
  }

  var angry = 0;

  if (!player.dead) {
    var car = cars.collides(player);
    if (car) {
      world.carHitPlayerExplode(car, player);
      player.onCarHit(car);
    }
    var particle = particles.collides(player);
    if (particle) {
      particle.explodeInWorld(world);
      particle.hitPlayer(player);
      particle.parent.removeChild(particle);
      angry ++;
    }
  }

  angry = Math.max(0, angry - dt * 0.001);

  if (player.dead) {
    this.audio1.setVolume(0);
  }
  else {
    this.audio1.setVolume( controls.x() || controls.y() ? 0.2 + Math.min(0.8, angry + danger / 4) : 0 );
  }

  if (player.maxProgress < 0) {
    player.life -= dt / 500;
  }

  var s = Player.getPlayerScore(player);
  if (s > 0) {
    this.score.setText("" + s);
    if (player.life > 0) {
      this.life.setText("" + ~~(player.life) + "%");
      this.life.setStyle({
        font: 'normal 20px '+font.name,
        fill: player.life < 20 ? '#F00' : (player.life < 50 ? '#F90' : (player.life < 100 ? '#999' : '#6C6'))
      });
    }
    else {
      this.life.setText("");
    }
  }

  if (!player.dead && player.life <= 0) {
    player.dead = 1;
    world.playerDied(player);
    world.removeChild(player);
    network.submitScore(player)
      .delay(6000)
      .fin(function () {
        window.location.reload();
      })
      .done();
  }

  var headChunk = - ~~(player.maxProgress / conf.HEIGHT);
  var aheadChunk = headChunk + 1;
  if (aheadChunk > this.currentAlloc) {
    this.map.allocChunk(t, ++this.currentAlloc);
  }

  [cars, particles].forEach(function (spawnerColl) {
    spawnerColl.children.forEach(function (spawner) {
      if (player.maxProgress < spawner.pos[1]-conf.HEIGHT-100) {
        spawner.parent.removeChild(spawner);
      }
    });
  });

  world.update(t, dt);

  world.focusOn(player);
  audio.micOn(player);
};

Game.prototype.destroy = function () {
};

Game.prototype.createDeadCarrot = function (score) {
  if (score.opacity > 0) {
    var deadCarrot = new DeadCarrot(score);
    this.deadCarrots.addChild(deadCarrot);
  }
}

module.exports = Game;
