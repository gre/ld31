
var PIXI = require("pixi.js");

var HomeTile = require("./HomeTile");
var MapTile = require("./MapTile");

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

module.exports = Map;
