var PIXI = require("pixi.js");

var World = require("../../src/World");
var Map = require("../../src/Map");
var SpawnerCollection = require("../../src/SpawnerCollection");
var DeadCarrot = require("../../src/DeadCarrot");
var conf = require("../../src/conf");
var font = require("../../src/font");

var data = require("./data.json");
var _ = require("lodash");

var DAY_MS = 24 * 3600 * 1000;

var days = _(data)
  .map(function (score) {
    return Math.floor(score.date / DAY_MS);
  })
  .uniq()
  .map(function (day) {
    var t = day * DAY_MS;
    return {
      day: day,
      timestamp: t,
      str: new Date(t).toISOString().substring(0, 10)
    };
  })
  .value();

var clp = 500;
var maxY = Math.ceil(_(data).pluck("score").max().value()/clp + 1) * clp;

var nbChunks = Math.ceil(maxY / 480);

var width = conf.WIDTH;
var height = maxY * width / conf.WIDTH;

var scale = 1;

var renderer = new PIXI.CanvasRenderer(width, height);

var canvas = document.createElement("canvas");
canvas.width = width * days.length * scale;
canvas.height = height * scale;
canvas.style.width = ~~(canvas.width / 2)+"px";
canvas.style.height = ~~(canvas.height / 2)+"px";
var ctx = canvas.getContext("2d");
document.body.appendChild(canvas);

var renders = _.map(days, function (day, dayIndex) {
  //if (i > 0) return;
  var scores = _.filter(data, function (score) {
    return day.timestamp <= score.date && score.date < day.timestamp + DAY_MS;
  });
  var best = _.max(scores, function (s) { return s.score; });

  var seed = "grewebisawesome" + day.day;

  var cars = new SpawnerCollection();
  var particules = new SpawnerCollection();
  var map = new Map(seed, cars, particules);
  var deads = new PIXI.DisplayObjectContainer();
  var deadCarrots = new PIXI.DisplayObjectContainer();

  var world = new World();
  world.addChild(map);
  world.addChild(particules);
  world.addChild(cars);
  world.addChild(deads);
  world.addChild(deadCarrots);

  world.position.y = maxY;

  var date = new PIXI.Text(day.str, {
    font: "bold 40px "+font.name,
    fill: "#B80"
  });
  date.position.x = (width-date.width)/2;

  var gold = PIXI.Sprite.fromImage("/img/scoreIcon1.png");
  gold.position.y = 50;
  gold.position.x = 120;
  gold.scale.x = 3;
  gold.scale.y = 3;

  var winner = new PIXI.Text(best.player, {
    font: "bold 30px "+font.name,
    fill: "#FA0",
    dropShadowColor: "#EB0",
    dropShadow: true,
    dropShadowAngle: 0,
    dropShadowDistance: 2
  });
  winner.position.y = 120;
  winner.position.x = (width-winner.width)/2;

  var stage = new PIXI.Stage(0xFFFFFF);
  stage.addChild(world);
  stage.addChild(date);
  stage.addChild(gold);
  stage.addChild(winner);

  scores.forEach(function (score) {
    var dead = new PIXI.Graphics();
    dead.endFill();
    dead.beginFill(0xFFCC55);
    dead.drawCircle(0, 0, 50);
    dead.endFill();
    dead.position.x = score.x;
    dead.position.y = -score.score;
    deads.addChild(dead);

    var deadCarrot = new DeadCarrot(score, false, false, 20);
    deadCarrots.addChild(deadCarrot);
  });

  for (var i=1; i <= nbChunks; ++i) {
    map.allocChunk(0, i);
  }

  var dt = 50;
  for (var t=0; t<5000; t += dt) {
    world.update(t, dt);
  }


  return function () {
    renderer.render(stage);
    ctx.drawImage(renderer.view, dayIndex * width * scale, 0, width * scale, height * scale);
  };
});

// document.body.appendChild(renderer.view);

setTimeout(function () {
  renders.forEach(function (f) { f(); });
}, 1000);
