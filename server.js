#!/usr/bin/env node

var MongoClient = require('mongodb').MongoClient;
var express = require("express");
var fs = require("fs");
var Q = require("q");

var app = express();
app.use(require("body-parser").json());

var MONGO = process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/ld31';
var PORT = process.env.PORT || 9832;
var COLL = "scores";

var connectMongo = Q.nbind(MongoClient.connect, MongoClient);

connectMongo(MONGO)
  .then(function (db) {
    return Q.ninvoke(db.collection(COLL).find(), "toArray");
  })
  .then(function (res) {
    console.log("Nb Entries: "+res.length);
  })
  .done();


app.get("/", function (req, res) {
  res
    .send("Nothing here.");
});

app.get("/scores", function (req, res) {
  connectMongo(MONGO)
  .then(function (db) {
    var collection = db.collection(COLL);
    return Q.ninvoke(collection.find(), "toArray");
  })
  .then(function (results) {
    res
      .header("Access-Control-Allow-Origin", "*")
      .header("Content-Type", "application/json")
      .send(JSON.stringify(results));
  })
  .fail(function (e) {
    console.log(e)
    console.log(e.stack);
    res.status(400).send(e.toString());
  })
  .done();
});

app.options("/scores", function (req, res) {
  res
    .header("Access-Control-Allow-Origin", "*")
    .header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    .header("Access-Control-Allow-Headers", "Content-Type")
    .send();
});

app.put("/scores", function (req, res) {
  connectMongo(MONGO)
  .then(function (db) {
    var item = req.body;
    if (
      typeof item.player === "string" && /^[a-z0-9]{3,20}$/.exec(item.player) &&
      typeof item.x === "number" &&
      typeof item.y === "number" &&
      0 <= item.x && item.x <= 320 &&
      -1000 > item.y
    ) {
      var collection = db.collection(COLL);
      item = {
        player: item.player,
        x: Math.round(item.x),
        y: Math.round(item.y),
        date: Date.now()
      };
      return Q.ninvoke(collection, "insert", item).thenResolve(item);
    }
    else {
      throw new Error("score requirement: { player /* alphanum in 3-20 chars */, x, y }");
    }
  })
  .then(function (item) {
    console.log(item);
    res
      .header("Access-Control-Allow-Origin", "*")
      .send();
  })
  .fail(function (e) {
    console.log(e)
    console.log(e.stack);
    res
      .header("Access-Control-Allow-Origin", "*")
      .status(400)
      .send(e.toString());
  })
  .done();
});

app.listen(PORT);
