var PIXI = require("pixi.js");
var requestAnimFrame = require("raf");
var Qajax = require("qajax");
var _ = require("lodash");
var smoothstep = require("smoothstep");
var seedrandom = require("seedrandom");

var WIDTH = 320;
var HEIGHT = 480;
var scoresEndPoint = "http://ld31.greweb.fr/scores";

var scoresP = refreshScore();

var stage = new PIXI.Stage(0xFFFFFF);
var renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT);
document.body.style.padding = "0";
document.body.style.margin = "0";
document.body.appendChild(renderer.view);
requestAnimFrame(loop);
setTimeout(getPlayerName, 100);

function getPlayerName () {
  var name = window.localStorage.player || prompt("What's your name? (3 to 20 alphanum characters)");
  if (!name) return null;
  if (! /^[a-zA-Z0-9]{3,20}$/.exec(name)) return getPlayerName();
  return window.localStorage.player = name;
}

function getPlayerScore (player) {
  return ~~Math.max(0, -player.maxProgress);
}
function scoreToY (score) {
  return -score;
};

function refreshScore () {
  return Qajax(scoresEndPoint)
    .then(Qajax.filterSuccess)
    .then(Qajax.toJSON);
}
function submitScore (player) {
  return Qajax(scoresEndPoint, {
    method: "PUT",
    data: player.getScore()
  })
  .then(Qajax.filterSuccess);
}

function collideRectangle (r1, r2) {
  return !(r2.x > (r1.x + r1.width) ||
      (r2.x + r2.width) < r1.x ||
      r2.y > (r1.y + r1.height) ||
      (r2.y + r2.height) < r1.y);
}

function velUpdate (t, dt) {
  if (this.vel) {
    this.position.x += this.vel[0] * dt;
    this.position.y += this.vel[1] * dt;
  }
}

function spriteCollides (sprite) {
  return collideRectangle(this.hitBox(), sprite.hitBox ? sprite.hitBox() : sprite) ? this : null;
}

function findChildrenCollide (sprite) {
  for (var k=0; k<this.children.length; ++k) {
    var collide = this.children[k].collides(sprite);
    if (collide) return collide;
  }
  return null;
}

function updateChildren (t, dt) {
  this.children.forEach(function (child) {
    if (child.update)
      child.update(t, dt);
  });
}

var mapTextures = [
  PIXI.Texture.fromImage("img/map1.png")
];
function MapTile (index) {
  PIXI.Sprite.call(this, mapTextures[index % mapTextures.length]);
};
MapTile.prototype = Object.create(PIXI.Sprite.prototype);
MapTile.prototype.constructor = MapTile;


var highscoreIcons = [
  PIXI.Texture.fromImage("img/scoreIcon1.png"),
  PIXI.Texture.fromImage("img/scoreIcon2.png"),
  PIXI.Texture.fromImage("img/scoreIcon3.png")
];
function HighScore (score, i) {
  PIXI.DisplayObjectContainer.call(this);
  if (highscoreIcons[i]) {
    var icon = new PIXI.Sprite(highscoreIcons[i]);
    icon.position.set(0, 0);
    this.addChild(icon);
  }

  var playerText = new PIXI.Text(score.player, { align: 'center', font: 'normal 10px monospace', fill: '#C40'});
  playerText.position.set(30, 10);
  this.addChild(playerText);

  var scoreText = new PIXI.Text(score.score, { align: 'center', font: 'bold 12px monospace', fill: '#C40'});
  scoreText.position.set(100, 10);
  this.addChild(scoreText);
};
HighScore.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
HighScore.prototype.constructor = HighScore;


var homeTexture = PIXI.Texture.fromImage("img/homebg.png");
function HomeTile () {
  PIXI.Sprite.call(this, homeTexture);
  var self = this;
  scoresP.then(function (scores) {
    scores = [].concat(scores);
    scores.sort(function (a, b) {
      return b.score - a.score;
    });
    var bestScores = scores.splice(0, 5);
    bestScores.forEach(function (score, i) {
      var h = new HighScore(score, i);
      h.position.set(40, 240 + 30 * i);
      self.addChild(h);
    });
  }).done();
};
HomeTile.prototype = Object.create(PIXI.Sprite.prototype);
HomeTile.prototype.constructor = HomeTile;

function Map () {
  PIXI.DisplayObjectContainer.call(this);
  this.addChild(new HomeTile());
  var y = 0;
  for (var i=0; i<9; ++i) {
    y -= 480;
    var tile = new MapTile(i);
    tile.position.y = y;
    this.addChild(tile);
  }
}
Map.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
Map.prototype.constructor = Map;
Map.prototype.update = function () {

};
Map.prototype.setForesee = function (y) {
  // TODO
};


function World () {
  PIXI.DisplayObjectContainer.call(this);

}
World.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
World.prototype.constructor = World;
World.prototype.update = updateChildren;
World.prototype.playerDied = function (player) {
  var obj = player.getScore();
  obj.opacity = 1;
  this.addChild(new DeadCarrot(obj, true, true));
};
World.prototype.snowballExplode = function (snowball) {
  console.log("snowball explode");
};
World.prototype.fireballExplode = function (fireball) {
  console.log("fireball explode");
};
World.prototype.focusOn = function (player) {
  y = HEIGHT-Math.max(player.position.y, player.maxProgress+120);
  //var y = HEIGHT-50-player.position.y;
  //var y = HEIGHT - Math.max(player.position.y, player.maxProgress-100);
  this.position.y = this.position.y + (y-this.position.y) * 0.06;
};


var playerTexture = PIXI.Texture.fromImage("img/player.png");
function Player () {
  PIXI.Sprite.call(this, playerTexture);
  this.life = 100;
}
Player.prototype = Object.create(PIXI.Sprite.prototype);
Player.prototype.constructor = Player;
Player.prototype.update = function (t, dt) {
  if (this.dead) return;
  var x = this.controls.x();
  var y = this.controls.y();

  this.position.x += 0.4 * x * dt;
  this.position.y -= 0.2 * y * dt;

  this.maxProgress = Math.min(this.maxProgress, this.position.y);

  this.position.x = Math.max(0, Math.min(this.position.x, WIDTH));
  this.position.y = Math.min(this.position.y, this.maxProgress+120);

  var scale = 0.5 + this.life / 100;
  this.scale.x = scale;
  this.scale.y = scale;
};
Player.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x + this.width * 0.25,
    y: this.y - this.pivot.y + this.height * 0.2,
    width: this.width * 0.5,
    height: this.height * 0.6
  };
};
Player.prototype.onSnowball = function () {
  this.life += 10;
};
Player.prototype.onFireball = function () {
  this.life -= 10;
};
Player.prototype.onCarHit = function () {
  this.life = 0;
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
   player: getPlayerName(),
   x: ~~player.position.x,
   score: getPlayerScore(player)
 };
};


var fireballTexture = PIXI.Texture.fromImage("img/fireball.png");
function Fireball (vel) {
  PIXI.Sprite.call(this, fireballTexture);
  this.vel = vel;
}
Fireball.prototype = Object.create(PIXI.Sprite.prototype);
Fireball.prototype.constructor = Fireball;
Fireball.prototype.update = function () {
  velUpdate.apply(this, arguments);
  if (this.position.y > 0) this.parent.removeChild(this);
};
Fireball.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x + 0.2 * this.width,
    y: this.y - this.pivot.y + 0.2 * this.height,
    width: this.width * 0.6,
    height: this.height * 0.6
  };
};
Fireball.prototype.explodeInWorld = function (world) {
  world.fireballExplode(this);
};
Fireball.prototype.hitPlayer = function () {
  player.onFireball(this);
}
Fireball.prototype.collides = spriteCollides;


var snowballTexture = PIXI.Texture.fromImage("img/snowball.png");
function Snowball (vel) {
  PIXI.Sprite.call(this, snowballTexture);
  this.vel = vel;
  this.scale.set(0.8, 0.8);
}
Snowball.prototype = Object.create(PIXI.Sprite.prototype);
Snowball.prototype.constructor = Snowball;
Snowball.prototype.update = function () {
  velUpdate.apply(this, arguments);
};
Snowball.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x,
    y: this.y - this.pivot.y,
    width: this.width,
    height: this.height
  };
};
Snowball.prototype.explodeInWorld = function (world) {
  world.snowballExplode(this);
};
Snowball.prototype.hitPlayer = function () {
  player.onSnowball(this);
};
Snowball.prototype.collides = spriteCollides;



var deadCarrotTexture = PIXI.Texture.fromImage("img/dead_carrot.png");
function DeadCarrot (score, animated, me) {
  PIXI.DisplayObjectContainer.call(this);
  var carrot = new PIXI.Sprite(deadCarrotTexture);
  carrot.pivot.set(12, 24);
  var text = new PIXI.Text(score.player, { align: 'center', font: 'normal 10px monospace', fill: me ?  '#F40' : '#C40'});
  text.position.set(-text.width/2, 0);
  this.position.set(score.x, scoreToY(score.score));
  this.addChild(carrot);
  this.addChild(text);
  this.alpha = score.opacity;
  this.animated = animated;
  this.start = Date.now();
};
DeadCarrot.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
DeadCarrot.prototype.constructor = DeadCarrot;
DeadCarrot.prototype.update = function () {
  if (this.animated) {
    var scale = 1 + smoothstep(4000, 0, Date.now()-this.start);
    this.scale.set(scale, scale);
  }
};

var carTextures = [
  PIXI.Texture.fromImage("img/car1.png"),
  PIXI.Texture.fromImage("img/car2.png"),
  PIXI.Texture.fromImage("img/car3.png")
];

function Car (vel) {
  PIXI.Sprite.call(this, carTextures[~~(Math.random()*carTextures.length)]);
  this.vel = vel;
}
Car.prototype = Object.create(PIXI.Sprite.prototype);
Car.prototype.constructor = Car;
Car.prototype.update = function () {
  velUpdate.apply(this, arguments);
};
Car.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x,
    y: this.y - this.pivot.y,
    width: this.width,
    height: this.height
  };
};
Car.prototype.collides = spriteCollides;


function KeyboardControls () {
  this._keys = {};
  document.body.addEventListener("keydown", this._onDown.bind(this), false);
  document.body.addEventListener("keyup", this._onUp.bind(this), false);
  window.addEventListener("focus", this._onFocus.bind(this), false);
  window.addEventListener("blur", this._onBlur.bind(this), false);
}
KeyboardControls.prototype = {
  _onFocus: function (e) {
    this._paused = 0;
  },
  _onBlur: function (e) {
    this._paused = 1;
  },
  _onDown: function (e) {
    if ([37,38,39,40].indexOf(e.which) >= 0)
      e.preventDefault();
    this._keys[e.which] = 1;
  },
  _onUp: function (e) {
    this._keys[e.which] = 0;
  },
  paused: function () {
    return this._paused;
  },
  x: function () {
    var left = !!(this._keys[37] || this._keys[81] || this._keys[65]);
    var right = !!(this._keys[39] || this._keys[68]);
    return -left +right;
  },
  y: function () {
    var up = !!(this._keys[38] || this._keys[90] || this._keys[87]);
    var down = !!(this._keys[40] || this._keys[83]);
    return +up -down;
  }
};

var SpawnerDefault = {
  pos: [0,0],
  ang: 0,
  vel: 0.1,
  randPos: 0,
  randAngle: 0,
  randVel: 0,
  rotate: 0,
  speed: 0,
  life: 10000,
  randLife: 0,
  livingBound: null
};
function Spawner (args) {
  PIXI.DisplayObjectContainer.call(this);
  _.extend(this, SpawnerDefault, args);
  this.setSpeed(this.speed);
  this.setSequence(this.seq);
  this.lastPop = 0;
  this.i = 0;
}
Spawner.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
Spawner.prototype.constructor = Spawner;
Spawner.prototype.setSpeed = function (speed) {
  this.running = speed>0;
  this.speed = speed;
};
Spawner.prototype.setSequence = function (seq) {
  this.seq = seq;
  this._seqi = 0;
  this._seqj = 0;
};
Spawner.prototype.update = function (t) {
  updateChildren.apply(this, arguments);
  this.children.forEach(function (child) {
    if (t > child._dieAfter || this.livingBound && !child.collides(this.livingBound)) {
      child.parent.removeChild(child);
    }
  }, this);

  if (!this.running || t < this.lastPop + this.speed) return;
  this.lastPop = t;
  
  if (this.seq && this.seq.length > 0) {
    var curSeq = this.seq[this._seqi];
    var shouldSkip = curSeq < 0;
    if (this._seqj >= Math.abs(curSeq)-1) {
      this._seqi = this._seqi >= this.seq.length-1 ? 0 : this._seqi + 1;
      this._seqj = 0;
    }
    else {
      this._seqj ++;
    }

    if (shouldSkip) return;
  }

  var particle = new this.Particle();
  particle.position.x = this.pos[0] + (Math.random() - 0.5) * this.randPos;
  particle.position.y = this.pos[1] + (Math.random() - 0.5) * this.randPos;
  var angle = this.ang + (Math.random() - 0.5) * this.randAngle + this.rotate * this.i;
  var vel = this.vel + (Math.random() - 0.5) * this.randVel;
  particle.vel = [
    vel * Math.cos(angle),
    -vel * Math.sin(angle)
  ];
  particle._dieAfter = t + this.life + this.randLife * (Math.random()-0.5);
  this.addChild(particle);
  this.i ++;
};
Spawner.prototype.collides = findChildrenCollide;

function SpawnerCollection () {
  PIXI.DisplayObjectContainer.call(this);
}
SpawnerCollection.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
SpawnerCollection.prototype.constructor = SpawnerCollection;
SpawnerCollection.prototype.update = updateChildren;
SpawnerCollection.prototype.collides = findChildrenCollide;


function Game () {
};
Game.prototype = {
  destroy: function () {

  },
  update: function (t) {

  }
};

var ui = new PIXI.DisplayObjectContainer();
var world = new World();
var map = new Map();
var keyboard = new KeyboardControls();
var player = new Player();
var cars = new SpawnerCollection();
var particles = new SpawnerCollection();
var deadCarrots = new PIXI.DisplayObjectContainer();
deadCarrots.update = updateChildren;

player.controls = keyboard;

stage.addChild(world);
world.addChild(map);
world.addChild(deadCarrots);
world.addChild(player);
world.addChild(cars);
world.addChild(particles);

player.pivot.x = 24;
player.pivot.y = 24;
player.position.x = WIDTH / 2;
player.position.y = HEIGHT - 30;
player.maxProgress = HEIGHT - 120;

var score = new PIXI.Text("", {});
stage.addChild(ui);
ui.addChild(score);

score.position.x = 10;
score.position.y = 10;

function addCarPath (y, leftToRight, vel, maxFollowing, maxHole, spacing) {
  var length = 10;
  var seq = [];
  for (var i=0; i<length; ++i) {
    var n = (i%2 ? -1 : 1) * ~~(1 + ( (i%2 ? maxHole : maxFollowing) - 1) * Math.random());
    seq.push(n);
  }
  var spawner = new Spawner({
    Particle: Car,
    pos: [ leftToRight ? -100 : WIDTH, y ],
    ang: leftToRight ? 0 : Math.PI,
    vel: vel,
    speed: (80 * (1+(spacing||0))) / vel,
    seq: seq
  });
  cars.addChild(spawner);
  return spawner;
}

function addDirectionalParticleSpawner (Particle, pos, ang, vel, speed, seq) {
  var spawner = new Spawner({
    Particle: Particle,
    pos: pos,
    ang: ang,
    vel: vel,
    speed: speed,
    seq: seq
  });
  particles.addChild(spawner);
  return spawner;
}

var roadDist = 60;

var roadTexture = PIXI.Texture.fromImage("img/road.png");
var roadInTexture = PIXI.Texture.fromImage("img/roadin.png");
var roadOutTexture = PIXI.Texture.fromImage("img/roadout.png");
var roadSeparatorTexture = PIXI.Texture.fromImage("img/roadseparator.png");

function addRoads (y, numberRoads) {
  for (var i=0; i<numberRoads; ++i) {
    var road = new PIXI.Sprite(roadTexture);
    road.position.set(0, y + i * roadDist);
    map.addChild(road);
    if (i==0) {
      road = new PIXI.Sprite(roadOutTexture);
      road.position.set(0, y + i * roadDist);
      map.addChild(road);
    }
    if (i==numberRoads-1) {
      road = new PIXI.Sprite(roadInTexture);
      road.position.set(0, y + i * roadDist);
      map.addChild(road);
    }
    if (i>0) {
      var roadSeparator = new PIXI.Sprite(roadSeparatorTexture);
      roadSeparator.position.set(- ~~(100*Math.random()), y + i * roadDist - 8);
      map.addChild(roadSeparator);
    }
  }
}


function allocChunk (i, random) {
  var y = -480 * i;

  if (i > 0) {
    var numberRoads = 3;
    for (var j=0; j<numberRoads; ++j) {
      addCarPath(y - 100 - j*roadDist, j % 2 === 0, 0.1, 4, 5, 0.3);
    }
    addRoads(y - 100 - (numberRoads-1) * roadDist, numberRoads);
  }

  if (i > 2) {
    addDirectionalParticleSpawner(Snowball, [300, y-450], -Math.PI/2 - 0.5, 0.3, 200, [10, -10]);
  }
  if (i > 4) {
    addDirectionalParticleSpawner(Fireball, [0,   y-450], -Math.PI/2 + 0.5, 0.3, 200, [10, -10]);
  }
}

/*
//,{ speed: 20, Particle: Snowball, pos: [ WIDTH/2, HEIGHT/2 ], vel: .3, rotate: 0.33 * Math.PI }
*/

var chunkAllocRandom = seedrandom("grewebisawesome");

function createDeadCarrot (score) {
  if (score.opacity > 0) {
    var deadCarrot = new DeadCarrot(score);
    deadCarrots.addChild(deadCarrot);
  }
}

scoresP.then(function (scores) {
  scores.forEach(createDeadCarrot);
}).done();

var lastAbsoluteTime;
var t = 0;

var currentAlloc = -1;

function loop (absoluteTime) {
  requestAnimFrame(loop);

  if (keyboard.paused()) {
    lastTime = t;
    return;
  }

  if (!lastAbsoluteTime) lastAbsoluteTime = absoluteTime;
  var dt = Math.min(100, absoluteTime - lastAbsoluteTime);
  lastAbsoluteTime = absoluteTime;
  t += dt;

  if (!player.dead) {
    
    var car = cars.collides(player);
    if (car) {
      player.onCarHit(car);
    }

    var particle = particles.collides(player);
    if (particle) {
      particle.explodeInWorld(world);
      particle.hitPlayer(player);
      particle.parent.removeChild(particle);
    }
  }

  cars.children.forEach(function (spawner) {
    spawner.children.forEach(function (car) {
      var particle = particles.collides(car);
      if (particle) {
        particle.explodeInWorld(world);
        particle.parent.removeChild(particle);
      }
    });
  });

  player.life -= dt / 500;


  var s = getPlayerScore(player);
  if (s > 0)
    score.setText("" + s);

  if (!player.dead && player.life <= 0) {
    player.dead = 1;
    world.playerDied(player);
    world.removeChild(player);
    submitScore(player)
      .delay(5000)
      .fin(function () {
        window.location.reload();
      })
      .done();
  }

  var headChunk = - ~~(player.maxProgress / HEIGHT);
  var aheadChunk = headChunk + 1;
  if (aheadChunk > currentAlloc) {
    allocChunk(++currentAlloc, chunkAllocRandom);
  }

  renderer.render(stage);

  world.update(t, dt);

  world.focusOn(player);
}
