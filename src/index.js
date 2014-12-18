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

var Game = require("./Game");
var Player = require("./Player");
var KeyboardControls = require("./KeyboardControls");

var EMBED = location.hash === "#embed";

var socket = io();

socket.on('connect', function(){ console.log("CONNECT"); });
socket.on('disconnect', function(){ console.log("DISCONNECT"); });

ntp.init(socket);

function now () {
  var off = ntp.offset();
  return Date.now();
}

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

var seed = "grewebisawesome" + ~~(Date.now() / (24 * 3600 * 1000));
console.log("seed = "+seed);


var controls = new KeyboardControls();
var game = new Game(seed, controls);
stage.addChild(game);

// move in Game?
network.initialScores().then(function (scores) {
  scores.forEach(game.createDeadCarrot, game);
}).done();

var lastAbsoluteTime;

function loop () {
  requestAnimFrame(loop);

  var t = now();
  if (!lastAbsoluteTime) lastAbsoluteTime = t;
  var dt = Math.min(100, t - lastAbsoluteTime);
  lastAbsoluteTime = t;

  game.update(t, dt);

  renderer.render(stage);

}

/*
socket.emit("move", player.position, player.width);

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

*/
