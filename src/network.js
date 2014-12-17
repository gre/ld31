
var Qajax = require("qajax");

var scoresEndPoint = "/scores";

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

module.exports = {
  refreshScore: refreshScore,
  submitScore: submitScore,
  scoresP: refreshScore()
};
