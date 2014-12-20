var seedrandom = require("seedrandom");
var PIXI = require("pixi.js");
var smoothstep = require("smoothstep");

var mix = require("./utils/mix");

var conf = require("./conf");

var HomeTile = require("./HomeTile");
var MapTile = require("./MapTile");
var Spawner = require("./Spawner");
var Car = require("./Car");
var Fireball = require("./Fireball");
var Snowball = require("./Snowball");

function Map (seed, cars, spawners) {
  PIXI.DisplayObjectContainer.call(this);

  this.random = seedrandom(seed);

  this.addChild(new HomeTile());
  this.y = 0;
  var y = 0;

  // FIXME
  for (var i=0; i<999; ++i) {
    y -= 480;
    var tile = new MapTile(i);
    tile.position.y = y;
    this.addChild(tile);
  }

  this.cars = cars;
  this.spawners = spawners;
}
Map.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
Map.prototype.constructor = Map;
Map.prototype.update = function (t, dt) {
  
};


Map.prototype.addCarPath = function (time, y, leftToRight, vel, maxFollowing, maxHole, spacing, random) {
  var length = 6;
  var seq = [];
  for (var i=0; i<length; ++i) {
    var n = (i%2 ? -1 : 1) * ~~(1 + ( (i%2 ? maxHole : maxFollowing) - 1) * random());
    seq.push(n);
  }
  var pos = [ leftToRight ? -100 : conf.WIDTH+100, y ];
  var spawner = new Spawner({
    seed: y,
    spawn: function (i, random) { return new Car(random); },
    pos: pos,
    ang: leftToRight ? 0 : Math.PI,
    vel: vel,
    speed: (80 * (1+(spacing||0))) / vel,
    seq: seq,
    livingBound: { x: -100, y: y, height: 100, width: conf.WIDTH+200 }
  });
  spawner.init(time);
  this.cars.addChild(spawner);
  return spawner;
}

Map.prototype.addDirectionalParticleSpawner = function (time, Particle, pos, ang, vel, speed, seq) {
  var spawner = new Spawner({
    seed: ""+pos,
    spawn: function (i, random) {
      var scale = 0.3 + 0.3 * random() + 0.3 * random() * random();
      return new Particle(scale);
    },
    pos: pos,
    ang: ang,
    vel: vel,
    speed: speed,
    seq: seq,
    life: 6000
  });
  spawner.init(time);
  this.spawners.addChild(spawner);
  return spawner;
}

Map.prototype.addRotatingParticleSpawner = function (time, Particle, pos, rotate, vel, speed, seq) {
  var spawner = new Spawner({
    seed: ""+pos,
    spawn: function (i, random) {
      var scale = 0.3 + 0.3 * random() + 0.3 * random() * random();
      return new Particle(scale);
    },
    pos: pos,
    vel: vel,
    rotate: rotate,
    speed: speed,
    seq: seq,
    life: 6000,
    angle: 0
  });
  spawner.init(time);
  this.spawners.addChild(spawner);
  return spawner;
}

var roadDist = 60;

var roadTexture = PIXI.Texture.fromImage("/img/road.png");
var roadInTexture = PIXI.Texture.fromImage("/img/roadin.png");
var roadOutTexture = PIXI.Texture.fromImage("/img/roadout.png");
var roadSeparatorTexture = PIXI.Texture.fromImage("/img/roadseparator.png");

Map.prototype.addRoads = function (y, numberRoads) {
  for (var i=0; i<numberRoads; ++i) {
    var road = new PIXI.Sprite(roadTexture);
    road.position.set(0, y + i * roadDist);
    this.addChild(road);
    if (i==0) {
      road = new PIXI.Sprite(roadOutTexture);
      road.position.set(0, y + i * roadDist - 10);
      this.addChild(road);
    }
    if (i==numberRoads-1) {
      road = new PIXI.Sprite(roadInTexture);
      road.position.set(0, y + i * roadDist + 10);
      this.addChild(road);
    }
    if (i>0) {
      var roadSeparator = new PIXI.Sprite(roadSeparatorTexture);
      roadSeparator.position.set(- ~~(100*Math.random()), y + i * roadDist - 8);
      this.addChild(roadSeparator);
    }
  }
}

Map.prototype.nSpawner = function (time, Particle, pos, n, offset, speed) {
  this.addRotatingParticleSpawner(time, Particle, pos, offset + 2*Math.PI / n, 0.25, speed / n);
}
Map.prototype.allocChunk = function (time, i) {
  var random = this.random;
  // TODO use a MapTile?

  var y = -480 * i;
  var pos, nb, n, off, j, speed, vel;
  var maxFollowing, maxHole, spacing;

  if (i > 0) {
    nb = ~~Math.min(6, 2*random()*random() + random() * (i / 8) + 1);
    for (j=0; j<nb; ++j) {
      vel = 0.05 + 0.05 * random() + 0.004 * (i + 10 * random() + 50 * random() * random());
      maxFollowing = 3 + (i / 20) * random() + 6 * random() * random();
      maxHole = 8 - 5 * mix(smoothstep(0, 20, i * random()), random(), 0.5) + random() / (i / 5);
      spacing = 0.2 + 0.3 * random();
      this.addCarPath(time, y - 100 - j*roadDist, j % 2 === 0, vel, maxFollowing, maxHole, spacing, random);
    }
    this.addRoads(y - 100 - (nb-1) * roadDist, nb);
  }

  if (i > 1 && random() < 0.9) {
    nb = 3 * random() * random() + 2 * random() * (10-i%10)/10 + 1;
    for (j=0; j<nb; ++j) {
      pos = [random()<0.5 ? 0 : conf.WIDTH, y-200*random()-280];
      n = 1 + ~~(random() * (3 * random() + i / 8));
      offset = random() * (random() * 0.3 + 0.1 * (i % 24) / 24);
      speed = (1-(i%50)/50) * 1000 * (1 - random()*random());
      this.nSpawner(time, Snowball, pos, n, offset, speed);
    }
  }

  if (i > 4 && random() < 0.9) {
    nb = 2 * random() * random() + random() * (i/8) + i / 30 + 0.5;
    for (j=0; j<nb; ++j) {
      pos = [random()<0.5 ? 0 : conf.WIDTH, y-200*random()-280];
      n = 1 + ~~(random() * (random() + i / 10));
      offset = random() * (random() * 0.3 + 0.1 * ((i+10) % 24) / 24);
      speed = (1-(i%50)/50) * 1000 * (1 - random()*random());
      this.nSpawner(time, Fireball, pos, n, offset, speed);
    }
  }
};

module.exports = Map;
