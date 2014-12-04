var PIXI = require("pixi.js");
var requestAnimFrame = require("raf");

var stage = new PIXI.Stage(0xFF6699);
var renderer = PIXI.autoDetectRenderer(400, 300);
document.body.appendChild(renderer.view);
requestAnimFrame(loop);

function loop () {
  requestAnimFrame(loop);

  renderer.render(stage);
}
