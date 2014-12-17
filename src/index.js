var PIXI = require("pixi.js");
var requestAnimFrame = require("raf");
var smoothstep = require("smoothstep");
var seedrandom = require("seedrandom");
var io = require("socket.io-client");

require("socket-ntp/client/ntp")
var ntp = window.ntp;

var audio = require("./audio");
var network = require("./network");
var conf = require("./conf");
var font = require("./font");

var World = require("./World");
var Map = require("./Map");
var Spawner = require("./Spawner");
var DeadCarrot = require("./DeadCarrot");
var Car = require("./Car");
var Fireball = require("./Fireball");
var Snowball = require("./Snowball");
var Player = require("./Player");
var KeyboardControls = require("./KeyboardControls");
var SpawnerCollection = require("./SpawnerCollection");

var findChildrenCollide = require("./behavior/findChildrenCollide");
var updateChildren = require("./behavior/updateChildren");
var velUpdate = require("./behavior/velUpdate");

var dist = require("./utils/dist");
var mix = require("./utils/mix");

var EMBED = location.hash === "#embed";

var socket = io();

socket.on('connect', function(){ console.log("CONNECT"); });
socket.on('disconnect', function(){ console.log("DISCONNECT"); });

ntp.init(socket);

function now () {
  var off = ntp.offset();
  return Date.now();
}

var audio1 = audio.loop("/audio/1.ogg");
// var audio2 = loopAudio("/audio/2.ogg");




var stage = new PIXI.Stage(0xFFFFFF);
var renderer = PIXI.autoDetectRenderer(conf.WIDTH, conf.HEIGHT, { resolution: window.devicePixelRatio });
renderer.view.style.width = conf.WIDTH+"px";
renderer.view.style.height = conf.HEIGHT+"px";

if (!EMBED)
  renderer.view.style.border = "6px ridge #88B";
document.body.style.padding = "0";
document.body.style.margin = "0";
var wrapper = document.createElement("div");
wrapper.style.margin = "0 auto";
wrapper.style.width = conf.WIDTH+"px";
document.body.appendChild(wrapper);
wrapper.appendChild(renderer.view);

if (!EMBED) {
  var link = document.createElement("a");
  link.href = "http://ludumdare.com/compo/ludum-dare-31/?action=preview&uid=18803";
  link.innerHTML = "LudumDare 31 entry";
  wrapper.appendChild(link);
}

requestAnimFrame(loop);
setTimeout(Player.getPlayerName, 100);



var ui = new PIXI.DisplayObjectContainer();
var world = new World();
var map = new Map();
var keyboard = new KeyboardControls();
var cars = new SpawnerCollection();
var particles = new SpawnerCollection();
var deadCarrots = new PIXI.DisplayObjectContainer();
var footprints = new PIXI.DisplayObjectContainer();
var player = new Player(footprints);
var players = new PIXI.DisplayObjectContainer();
deadCarrots.update = updateChildren;

player.controls = keyboard;

stage.addChild(world);
world.addChild(map);
world.addChild(footprints);
world.addChild(deadCarrots);
world.addChild(players);
world.addChild(player);
world.addChild(cars);
world.addChild(particles);

player.position.x = conf.WIDTH / 2;
player.position.y = conf.HEIGHT - 30;
player.maxProgress = conf.HEIGHT - 120;

var score = new PIXI.Text("", { font: 'bold 20px '+font.name, fill: '#88B' });
var life = new PIXI.Text("");
ui.addChild(score);
ui.addChild(life);
stage.addChild(ui);

score.position.x = 10;
score.position.y = 10;
life.position.x = conf.WIDTH - 60;
life.position.y = 10;

function addCarPath (y, leftToRight, vel, maxFollowing, maxHole, spacing, random) {
  var length = 10;
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
  spawner.init(now());
  cars.addChild(spawner);
  return spawner;
}

function addDirectionalParticleSpawner (Particle, pos, ang, vel, speed, seq) {
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
  spawner.init(now());
  particles.addChild(spawner);
  return spawner;
}

function addRotatingParticleSpawner (Particle, pos, rotate, vel, speed, seq) {
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
  spawner.init(now());
  particles.addChild(spawner);
  return spawner;
}

var roadDist = 60;

var roadTexture = PIXI.Texture.fromImage("/img/road.png");
var roadInTexture = PIXI.Texture.fromImage("/img/roadin.png");
var roadOutTexture = PIXI.Texture.fromImage("/img/roadout.png");
var roadSeparatorTexture = PIXI.Texture.fromImage("/img/roadseparator.png");

function addRoads (y, numberRoads) {
  for (var i=0; i<numberRoads; ++i) {
    var road = new PIXI.Sprite(roadTexture);
    road.position.set(0, y + i * roadDist);
    map.addChild(road);
    if (i==0) {
      road = new PIXI.Sprite(roadOutTexture);
      road.position.set(0, y + i * roadDist - 10);
      map.addChild(road);
    }
    if (i==numberRoads-1) {
      road = new PIXI.Sprite(roadInTexture);
      road.position.set(0, y + i * roadDist + 10);
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
      addCarPath(y - 100 - j*roadDist, j % 2 === 0, vel, maxFollowing, maxHole, spacing, random);
    }
    addRoads(y - 100 - (nb-1) * roadDist, nb);
  }

  if (i > 1 && random() < 0.9) {
    nb = 3 * random() * random() + 2 * random() * (10-i%10)/10 + 1;
    for (j=0; j<nb; ++j) {
      pos = [random()<0.5 ? 0 : conf.WIDTH, y-200*random()-280];
      n = 1 + ~~(random() * (3 * random() + i / 8));
      offset = random() * (random() * 0.3 + 0.1 * (i % 24) / 24);
      speed = (1-(i%50)/50) * 1000 * (1 - random()*random());
      nSpawner(Snowball, pos, n, offset, speed);
    }
  }

  if (i > 4 && random() < 0.9) {
    nb = 2 * random() * random() + random() * (i/8) + i / 30 + 0.5;
    for (j=0; j<nb; ++j) {
      pos = [random()<0.5 ? 0 : conf.WIDTH, y-200*random()-280];
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

network.scoresP.then(function (scores) {
  scores.forEach(createDeadCarrot);
}).done();

var lastAbsoluteTime;

var currentAlloc = -1;

function loop () {
  requestAnimFrame(loop);

  if (keyboard.paused()) {
    lastTime = t;
    return;
  }

  var t = now();
  if (!lastAbsoluteTime) lastAbsoluteTime = t;
  var dt = Math.min(100, t - lastAbsoluteTime);
  lastAbsoluteTime = t;

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
    audio1.setVolume(0);
  }
  else {
    audio1.setVolume( keyboard.x() || keyboard.y() ? 0.2 + Math.min(0.8, angry + danger / 4) : 0 );
  }

  if (player.maxProgress < 0) {
    player.life -= dt / 500;
  }

  var s = Player.getPlayerScore(player);
  if (s > 0) {
    score.setText("" + s);
    if (player.life > 0) {
      life.setText("" + ~~(player.life) + "%");
      life.setStyle({
        font: 'normal 20px '+font.name,
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
    network.submitScore(player)
      .delay(6000)
      .fin(function () {
        window.location.reload();
      })
      .done();
  }

  var headChunk = - ~~(player.maxProgress / conf.HEIGHT);
  var aheadChunk = headChunk + 1;
  if (aheadChunk > currentAlloc) {
    allocChunk(++currentAlloc, chunkAllocRandom);
  }

  [cars,particles].forEach(function (spawnerColl) {
    spawnerColl.children.forEach(function (spawner) {
      if (player.maxProgress < spawner.pos[1]-conf.HEIGHT-100) {
        spawner.parent.removeChild(spawner);
      }
    });
  });

  renderer.render(stage);

  world.update(t, dt);

  world.focusOn(player);
  audio.micOn(player);

  socket.emit("move", player.position, player.width);
}


var playersByIds = {};

socket.on("playermove", function (move) {
  console.log("move", arguments);
  var p = playersByIds[move.id];
  if (!p) {
    var p = new OtherPlayer();
    p.position.x = -1000;
    playersByIds[move.id] = p;
    players.addChild(p);
  }
  p.height = p.width = move.width;
  p.position.set(move.pos.x, move.pos.y);
});

socket.on("playerquit", function () {
  var p = playersByIds[move.id];
  if (p) {
    players.removeChild(p);
    delete playersByIds[move.id];
  }
});

