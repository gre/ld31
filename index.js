var PIXI = require("pixi.js");
var requestAnimFrame = require("raf");
var Qajax = require("qajax");
var _ = require("lodash");
var smoothstep = require("smoothstep");
var seedrandom = require("seedrandom");
var jsfxr = require("./jsfxr");

var DEBUG = false;

function loopAudio (src) {
  var volume = 0;
  var current;

  function step () {
    var audio = new Audio();
    audio.addEventListener('ended', function () {
      step();
    });
    audio.src = src;
    audio.volume = volume;
    audio.play();
    current = audio;
  }

  step();

  return {
    setVolume: function (v) {
      current.volume = volume = v;
    }
  };
}

var audio1 = loopAudio("audio/1.ogg");
var audio2 = loopAudio("audio/2.ogg");

function tilePIXI (size) {
  return function (baseTexture, x, y) {
    return new PIXI.Texture(baseTexture, { x: x * size, y: y * size, width: size, height: size });
  };
};
var tile64 = tilePIXI(64);
var tile24 = tilePIXI(24);

function mix (a, b, x) {
  return x * b + (1-x)*a;
}

function burnGen (f) {
  return jsfxr([3,,0.2597,0.3427,0.3548,0.04+0.03*f,,0.1573,,,,,,,,,0.3027,-0.0823,1,,,,,0.5]);
}

var SOUNDS = {
  burn: [burnGen(0),burnGen(0.2),burnGen(0.4),burnGen(0.6),burnGen(0.8),burnGen(1)],
  snowballHit: jsfxr([3,0.03,0.1,0.14,0.28,0.92,,-0.02,,,,0.0155,0.8768,,,,,,0.35,,,,,0.5]),
  carHit: jsfxr([0,,0.11,,0.1997,0.29,,-0.3599,-0.04,,,,,0.1609,,,,,1,,,,,0.5]),
  car: [
    jsfxr([3,0.3,0.7,,0.82,0.23,,-0.0999,,,,-0.02,,,,,0.62,,0.09,,,0.55,,0.5]),
    jsfxr([3,0.4,0.7,,0.82,0.13,,0.08,,,,-0.02,,,,,0.62,,0.09,,,0.55,,0.5]),
    jsfxr([2,0.29,0.6,,0.66,0.12,,-0.04,,,,-0.02,,,,,0.62,,0.08,,,0.33,-0.02,0.5])
  ]
};

function play (src, obj, volume) {
  if (typeof src === "object" && src.length) {
    return play(src[~~(Math.random()*src.length)], obj, volume);
  }
  var volume = volume || 1;
  if (obj) {
    var dx = obj.x - player.x;
    var dy = obj.y - player.y;
    var dist = Math.sqrt(dx*dx+dy*dy);
    volume *= Math.pow(smoothstep(350, 40, dist), 3);
  }
  if (!volume) return;
  var audio = new Audio();
  audio.src = src;
  audio.volume = volume;
  audio.play();
}

var WIDTH = 320;
var HEIGHT = 480;
var scoresEndPoint = "http://ld31.greweb.fr/scores";

var scoresP = refreshScore();

WebFontConfig = {
  google: { families: [ 'Monda:400,700:latin' ] }
};
(function() {
  var wf = document.createElement('script');
  wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
  '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
  wf.type = 'text/javascript';
  wf.async = 'true';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(wf, s);
})();


var stage = new PIXI.Stage(0xFFFFFF);
var renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT, { resolution: window.devicePixelRatio });
renderer.view.style.width = WIDTH+"px";
renderer.view.style.height = HEIGHT+"px";
renderer.view.style.border = "6px ridge #88B";
document.body.style.padding = "0";
document.body.style.margin = "0";
var wrapper = document.createElement("div");
wrapper.style.margin = "0 auto";
wrapper.style.width = WIDTH+"px";
document.body.appendChild(wrapper);
wrapper.appendChild(renderer.view);
requestAnimFrame(loop);
setTimeout(getPlayerName, 100);

function getPlayerName () {
  var name = window.localStorage.player || prompt("What's your name? (3 to 10 alphanum characters)");
  if (!name) return null;
  if (! /^[a-zA-Z0-9]{3,10}$/.exec(name)) return getPlayerName();
  return window.localStorage.player = name;
}

function getPlayerScore (player) {
  return ~~Math.max(0, -player.maxProgress);
}
function scoreToY (score) {
  return -score;
};

function dist (a, b) {
  var dx = a.position.x - b.position.x;
  var dy = a.position.y - b.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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

  var playerText = new PIXI.Text(score.player, { align: 'center', font: 'normal 10px Monda', fill: '#C40'});
  playerText.position.set(30, 10);
  this.addChild(playerText);

  var scoreText = new PIXI.Text(score.score, { align: 'center', font: 'bold 12px Monda', fill: '#C40'});
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
  this.y = 0;
  var y = 0;
  for (var i=0; i<999; ++i) {
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


var footsTexture = PIXI.Texture.fromImage("img/foots.png");
var footsTextures = [0,1,2,3,4,5,6,7,8,9].map(function (i) {
  return tile24(footsTexture, 0, i);
});
function Foot (position) {
  PIXI.Sprite.call(this, footsTextures[~~(Math.random()*footsTextures.length)]);
  this.position.x = position.x;
  this.position.y = position.y;
  this.rotation = Math.random() * 2 * Math.PI;
  this.pivot.set(12, 12);
}
Foot.prototype = Object.create(PIXI.Sprite.prototype);
Foot.prototype.constructor = Foot;


var fireExplosionTexture = PIXI.Texture.fromImage("img/fireexplosion.png");
var fireExplosionTextures = [
  tile64(fireExplosionTexture, 0, 0),
  tile64(fireExplosionTexture, 1, 0),
  tile64(fireExplosionTexture, 2, 0)
];
var snowExplosionTexture = PIXI.Texture.fromImage("img/snowexplosion.png");
var snowExplosionTextures = [
  tile64(snowExplosionTexture, 0, 0),
  tile64(snowExplosionTexture, 1, 0),
  tile64(snowExplosionTexture, 2, 0)
];
var playerExplosionTexture = PIXI.Texture.fromImage("img/playerexplosion.png");
var playerExplosionTextures = [
  tile64(playerExplosionTexture, 0, 0),
  tile64(playerExplosionTexture, 1, 0),
  tile64(playerExplosionTexture, 2, 0)
];
function ParticleExplosion (ref, textures, speed) {
  PIXI.DisplayObjectContainer.call(this);
  this.position.x = ref.position.x;
  this.position.y = ref.position.y;
  this.speed = speed || 100;
  this.width = ref.width;
  this.height = ref.width;
  this.rotation = Math.random() * 2 * Math.PI;
  this.pivot.set(32, 32);
  this.sprites = textures.map(function (t) {
    return new PIXI.Sprite(t);
  });
}
ParticleExplosion.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
ParticleExplosion.prototype.constructor = ParticleExplosion;
ParticleExplosion.prototype.update = function (t) {
  if (!this.current) {
    this.start = t;
  }
  var i = ~~((t-this.start)/this.speed);
  if (i < 3) {
    var s = this.sprites[i];
    if (s !== this.current) {
      if (this.current) this.removeChild(this.current);
      this.addChild(s);
      this.current = s;
    }
  }
  else {
    this.parent.removeChild(this);
  }
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
  var self = this;
  setTimeout(function () {
    self.addChild(new DeadCarrot(obj, true, true));
  }, 800);
  this.addChild(new ParticleExplosion(player, playerExplosionTextures, 250));
};
World.prototype.snowballExplode = function (snowball) {
  play(SOUNDS.snowballHit, snowball, 0.6);
  this.addChild(new ParticleExplosion(snowball, snowExplosionTextures));
};
World.prototype.fireballExplode = function (fireball) {
  play(SOUNDS.burn, fireball, 0.3);
  this.addChild(new ParticleExplosion(fireball, fireExplosionTextures));
};
World.prototype.focusOn = function (player) {
  y = HEIGHT-Math.max(player.position.y, player.maxProgress+120);
  //var y = HEIGHT-50-player.position.y;
  //var y = HEIGHT - Math.max(player.position.y, player.maxProgress-100);
  this.position.y = this.position.y + (y-this.position.y) * 0.06;
};



var playerTexture = PIXI.Texture.fromImage("img/player.png");
var playerWalkTextures = [
  PIXI.Texture.fromImage("img/player1.png"),
  playerTexture,
  PIXI.Texture.fromImage("img/player2.png")
];
function Player () {
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

  this.position.x = Math.max(0, Math.min(this.position.x, WIDTH));
  this.position.y = Math.min(this.position.y, this.maxProgress+120);

  var scale = 0.6 + this.life / 150;
  this.width  = 40 * scale;
  this.height = 40 * scale;

  if (x || y) {
    if (Math.random()<0.8) footprints.addChild(new Foot(this.position));
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
  play(SOUNDS.carHit, null, 1.0);
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
  var scale = 0.3 + 0.2 * Math.random() + 0.5 * Math.random() * Math.random();
  this.scale.set(scale, scale);
  if (DEBUG) world.addChild(new DebugSprite(this));
}
Fireball.prototype = Object.create(PIXI.Sprite.prototype);
Fireball.prototype.constructor = Fireball;
Fireball.prototype.update = function () {
  velUpdate.apply(this, arguments);
  if (this.position.y > 0) this.parent.removeChild(this);
};
Fireball.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x * this.scale.x + 0.2 * this.width,
    y: this.y - this.pivot.y * this.scale.y + 0.2 * this.height,
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
  var scale = 0.5 + 0.5 * Math.random();
  this.scale.set(scale, scale);
  if (DEBUG) world.addChild(new DebugSprite(this));
}
Snowball.prototype = Object.create(PIXI.Sprite.prototype);
Snowball.prototype.constructor = Snowball;
Snowball.prototype.update = function () {
  velUpdate.apply(this, arguments);
};
Snowball.prototype.hitBox = function () {
  return {
    x: this.x - this.pivot.x * this.scale.x,
    y: this.y - this.pivot.y * this.scale.y,
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


var debugTexture = PIXI.Texture.fromImage("img/debug.png");
function DebugSprite (observe) {
  PIXI.Sprite.call(this, debugTexture);
  this.o = observe;
}
DebugSprite.prototype = Object.create(PIXI.Sprite.prototype);
DebugSprite.prototype.constructor = DebugSprite;
DebugSprite.prototype.update = function () {
  var hitBox = this.o.hitBox();
  this.position.set(hitBox.x, hitBox.y);
  this.width = hitBox.width;
  this.height = hitBox.height;
}


var deadCarrotTexture = PIXI.Texture.fromImage("img/dead_carrot.png");
function DeadCarrot (score, animated, me) {
  PIXI.DisplayObjectContainer.call(this);
  var carrot = new PIXI.Sprite(deadCarrotTexture);
  carrot.pivot.set(12, 24);
  var text = new PIXI.Text(score.player, { align: 'center', font: 'normal 10px Monda', fill: me ?  '#F40' : '#C40'});
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
  PIXI.Texture.fromImage("img/car3.png"),
  PIXI.Texture.fromImage("img/car4.png"),
  PIXI.Texture.fromImage("img/car5.png"),
  PIXI.Texture.fromImage("img/car6.png"),
  PIXI.Texture.fromImage("img/car7.png"),
  PIXI.Texture.fromImage("img/car8.png"),
  PIXI.Texture.fromImage("img/car9.png"),
  PIXI.Texture.fromImage("img/car10.png")
];

function Car (vel) {
  PIXI.Sprite.call(this, carTextures[~~(Math.random()*carTextures.length)]);
  this.vel = vel;
  this.width = 0;
  this.height = 0;
  if (DEBUG) world.addChild(new DebugSprite(this));
}
Car.prototype = Object.create(PIXI.Sprite.prototype);
Car.prototype.constructor = Car;
Car.prototype.update = function () {
  this.width  = this.vel[0] < 0 ? -84 : 84;
  this.height = 48;
  velUpdate.apply(this, arguments);
};
Car.prototype.hitBox = function () {
  var w = Math.abs(this.width);
  return {
    x: Math.min(this.x, this.x+this.width) - this.pivot.x + w * 0.2,
    y: Math.min(this.y, this.y+this.height) - this.pivot.y,
    width: w * 0.6,
    height: Math.abs(this.height)
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
  var angle = this.ang + (Math.random() - 0.5) * this.randAngle + (this.rotate * this.i) % (2*Math.PI);
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
var footprints = new PIXI.DisplayObjectContainer();
deadCarrots.update = updateChildren;

player.controls = keyboard;

stage.addChild(world);
world.addChild(map);
world.addChild(footprints);
world.addChild(deadCarrots);
world.addChild(player);
world.addChild(cars);
world.addChild(particles);

player.position.x = WIDTH / 2;
player.position.y = HEIGHT - 30;
player.maxProgress = HEIGHT - 120;

if (DEBUG) world.addChild(new DebugSprite(player));

var score = new PIXI.Text("", { font: 'bold 20px Monda', fill: '#88B' });
var life = new PIXI.Text("");
ui.addChild(score);
ui.addChild(life);
stage.addChild(ui);

score.position.x = 10;
score.position.y = 10;
life.position.x = WIDTH - 60;
life.position.y = 10;

function addCarPath (y, leftToRight, vel, maxFollowing, maxHole, spacing) {
  var length = 10;
  var seq = [];
  for (var i=0; i<length; ++i) {
    var n = (i%2 ? -1 : 1) * ~~(1 + ( (i%2 ? maxHole : maxFollowing) - 1) * Math.random());
    seq.push(n);
  }
  var pos = [ leftToRight ? -100 : WIDTH+100, y ];
  var spawner = new Spawner({
    Particle: Car,
    pos: pos,
    ang: leftToRight ? 0 : Math.PI,
    vel: vel,
    speed: (80 * (1+(spacing||0))) / vel,
    seq: seq,
    livingBound: { x: -100, y: y, height: 100, width: WIDTH+200 }
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
    seq: seq,
    life: 6000
  });
  particles.addChild(spawner);
  return spawner;
}

function addRotatingParticleSpawner (Particle, pos, rotate, vel, speed, seq) {
  var spawner = new Spawner({
    Particle: Particle,
    pos: pos,
    vel: vel,
    rotate: rotate,
    speed: speed,
    seq: seq,
    life: 6000,
    angle: Math.random() * 2 * Math.PI
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

function nSpawner (Particle, pos, n, offset, speed) {
  addRotatingParticleSpawner(Particle, pos, offset + 2*Math.PI / n, 0.25, speed / n);
}

function allocChunk (i, random) {
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
      addCarPath(y - 100 - j*roadDist, j % 2 === 0, vel, maxFollowing, maxHole, spacing);
    }
    addRoads(y - 100 - (nb-1) * roadDist, nb);
  }

  if (i > 1 && random() < 0.9) {
    nb = 3 * random() * random() + 2 * random() * (10-i%10)/10 + 1;
    for (j=0; j<nb; ++j) {
      pos = [random()<0.5 ? 0 : WIDTH, y-200*random()-280];
      n = 1 + ~~(random() * (3 * random() + i / 8));
      offset = random() * (random() * 0.3 + 0.1 * (i % 24) / 24);
      speed = (1-(i%50)/50) * 1000 * (1 - random()*random());
      nSpawner(Snowball, pos, n, offset, speed);
    }
  }

  if (i > 4 && random() < 0.9) {
    nb = 2 * random() * random() + random() * (i/8) + i / 30 + 0.5;
    for (j=0; j<nb; ++j) {
      pos = [random()<0.5 ? 0 : WIDTH, y-200*random()-280];
      n = 1 + ~~(random() * (random() + i / 10));
      offset = random() * (random() * 0.3 + 0.1 * ((i+10) % 24) / 24);
      speed = (1-(i%50)/50) * 1000 * (1 - random()*random());
      nSpawner(Fireball, pos, n, offset, speed);
    }
  }

}


/*
//,{ speed: 20, Particle: Snowball, pos: [ WIDTH/2, HEIGHT/2 ], vel: .3, rotate: 0.33 * Math.PI }
*/

var seed = "grewebisawesome" + ~~(Date.now() / (24 * 3600 * 1000));
console.log("seed = "+seed);
var chunkAllocRandom = seedrandom(seed);

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

  var triggerCar = 0;
  var danger = 0;
  cars.children.forEach(function (spawner) {
    spawner.children.forEach(function (car) {
      var particle = particles.collides(car);
      if (particle) {
        particle.explodeInWorld(world);
        particle.parent.removeChild(particle);
      }
      var d = dist(car, player);
      danger += Math.pow(smoothstep(300, 100, d), 2);
      if (!car.neverSaw && d < 250) {
        car.neverSaw = 1;
        triggerCar ++;
      }
    });
  });

  if (triggerCar) {
    play(SOUNDS.car);
  }

  audio1.setVolume( keyboard.x() || keyboard.y() ? 1 : 0 );
  audio2.setVolume( Math.min(danger / 2, 1) );

  if (player.maxProgress < 0) {
    player.life -= dt / 500;
  }

  var s = getPlayerScore(player);
  if (s > 0) {
    score.setText("" + s);
    if (player.life > 0) {
      life.setText("" + ~~(player.life) + "%");
      life.setStyle({
        font: 'normal 20px Monda',
        fill: player.life < 20 ? '#F00' : (player.life < 50 ? '#F90' : (player.life < 100 ? '#999' : '#6C6'))
      });
    }
    else {
      life.setText("");
    }
  }

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

  [cars,particles].forEach(function (spawnerColl) {
    spawnerColl.children.forEach(function (spawner) {
      if (player.maxProgress < spawner.pos[1]-HEIGHT-100) {
        spawner.parent.removeChild(spawner);
      }
    });
  });

  renderer.render(stage);

  world.update(t, dt);

  world.focusOn(player);
}
