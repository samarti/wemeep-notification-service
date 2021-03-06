'use strict'

var xmpp = require('node-xmpp-client');
var express = require('express');
var bodyParser = require('body-parser');
var request = require("request");
var Futures = require("futures");

var jobPayload;
var xmppClient;
var connected = false;
var PORT = 8080;
var RADIUS = 10;
var sessionServiceUrl = "http://54.233.99.166:4567";
var meepServiceUrl = "http://54.232.209.214:4567";
var GCM_API_KEY = 'AIzaSyBX6i49nObb0Vu84nJ-_NxrYP69us3UamE';

//Base options, not to be changed
var options = {
  type: 'client',
  jid: '124076137297@gcm.googleapis.com',
  password: GCM_API_KEY,
  port: 5235,
  host: 'gcm.googleapis.com',
  legacySSL: true,
  preferredSaslMechanism : 'PLAIN'
};

xmppClient = new xmpp.Client(options);
xmppClient.connection.socket.setTimeout(0);
xmppClient.connection.socket.setKeepAlive(true, 10000);

xmppClient.on('stanza',
  function(stanza) {
    console.log("Stanza:")
    console.log(stanza.toString());
      if (stanza.is('message') && stanza.attrs.type !== 'error') {
          var messageData = JSON.parse(stanza.getChildText("gcm"));
          if (messageData && messageData.message_type == "ack" && messageData.message_type != "nack") {
              /*
              var ackMsg = new xmpp.Element('message', {'id': ''}).c('gcm', {xmlns: 'google:mobile:data'}).t(JSON.stringify({
                  "to": messageData.from,
                  "message_id": messageData.message_id,
                  "message_type": "ack"
              }));
              xmppClient.send(ackMsg);
              console.log("Sent ack");*/
          }
      } else {
          console.log("error");
          console.log(stanza);
      }
});

xmppClient.on('error', function(e) {
    console.log("Error occured:");
    console.error(e);
    console.error(e.children);
});


xmppClient.connection.socket.on('error', function(err) {
  console.log('error : ',err);
});

xmppClient.on('reconnect', function() {
    console.log('reconnnecting....');
});

xmppClient.on('connect', function() {
    console.log('connnecting....');
});

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function sendNotificationToDevice(to, message) {
  var payload = {
      "to": to,
      "message_id": randomInt(1, 2000000) + "",
      "data": message,
      "time_to_live": 0,
      "delay_while_idle": false,
      "notification": message,
      "content_available": true,
      "priority":"high",
      "aps": {
        "alert": message["senderName"] + " sent a notification",
        "badge": 1,
        "sound": "default"
      }
  };
  var jsonPayload = JSON.stringify(payload);
  var someId = Date.now();
  console.log("Sending notification to " + someId);
  var ackToDevice = new xmpp.Element('message', {'id': someId, 'userIp': '54.233.117.55'}).c('gcm', {xmlns: 'google:mobile:data'}).t(jsonPayload);
  xmppClient.send(ackToDevice);
}

xmppClient.on('online', function() {
  console.log("Online");
  connected = true;
});

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

//Con el rootMeepId vamos a buscar los ids registrados. Con ellos, vamos
//buscar sus gcmId.
function newMessage(res, meepId, data){
  var gcmIds = [];
  var sequence = Futures.sequence();
  sequence.then(function(next){
    request({
      uri: meepServiceUrl + "/meeps/" + meepId + "/registrees",
      method: "GET",
      timeout: 10000,
      followRedirect: true,
      maxRedirects: 10
    }, function(error, response, body) {
      if(error === null) {
        next(body);
        console.log("Step 1");
      } else
        res.json({"Error":error});
    });
  }).then(function(next, response){

    var jsonData = JSON.parse(response);
    for (var i = 0; i < jsonData.length; i++) {
        var id = jsonData[i];
        request({
          uri: sessionServiceUrl + "/session/" + id.id,
          method: "GET",
          timeout: 10000,
          followRedirect: true,
          maxRedirects: 10
        }, function(error, response, body) {
          if(error !== null){
            console.log(error);
            res.json({"Error":error});
          } else {
            console.log("Step 2");
            var resData = JSON.parse(body);
            console.log(resData);
            console.log(resData);
            for (var i = 0; i < resData.length; i++) {
                var auxId = resData[i].gcmId;
                console.log(auxId);
                sendNotificationToDevice(auxId, data);
            }
          }
        });
      }
  });
}

function newMeep(res, meepId, data){
  var sequence = Futures.sequence();
  sequence.then(function(next){
    request({
      uri: meepServiceUrl + "/meeps/" + meepId,
      method: "GET",
      timeout: 10000,
      followRedirect: true,
      maxRedirects: 10
    }, function(error, response, body) {
      if(error === null) {
        console.log("Step 1");
        next(body);
      } else {
        console.log(error);
      }
    });
  }).then(function(next, response){
    var jsonData = JSON.parse(response);
    var id = jsonData.objectId;
    console.log("Step 2");
    if(jsonData.isPublic){
      request({
        uri: sessionServiceUrl + "/closeusers?lat=" + jsonData.latitude + "&longi=" + jsonData.longitude + "&radius=" + RADIUS,
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
      }, function(error, response, body) {
        if(error !== null)
          res.json({"Error":error});
        else {
          var resData = JSON.parse(body);
          console.log("Step 3");
          console.log(resData);
          for (var i = 0; i < resData.length; i++) {
              var auxId = resData[i].gcmId;
              sendNotificationToDevice(auxId, data);
          }
        }
      });
    } else {
      var sequence2 = Futures.sequence();
      data["type"] = "newSecretMeep";
      sequence2.then(function(next){
        request({
          uri: meepServiceUrl + "/meeps/" + id + "/receipts",
          method: "GET",
          timeout: 10000,
          followRedirect: true,
          maxRedirects: 10
        }, function(error, response, body) {
          if(error === null) {
            next(body);
          } else
            res.json({"Error":error});
        });

      }).then(function(next, response){
        var jsonData = JSON.parse(response);
        for (var i = 0; i < jsonData.length; i++) {
            var id = jsonData[i];
            request({
              uri: sessionServiceUrl + "/session/" + id.id,
              method: "GET",
              timeout: 10000,
              followRedirect: true,
              maxRedirects: 10
            }, function(error, response, body) {
              if(error !== null)
                res.json({"Error":error});
              else {
                var resData = JSON.parse(body);
                console.log(resData);
                for (var i = 0; i < resData.length; i++) {
                    var auxId = resData[i].gcmId;
                    sendNotificationToDevice(auxId, data);
                }
              }
            });
          }
      });
    }
  });
}

app.get('/', function(req, res){
  res.send("<h1>WeMeep Notification Service</h1> <br> <i>Version: 1.0.2</i>");
});

app.post('/notificate', function(req, res){
  var silent = req.body.silent;
  var type = req.body.type;
  var senderName = req.body.senderName;
  var senderId = req.body.senderId;
  var rootMeepId = req.body.rootMeepId;
  var meepComment = req.body.meepComment;
  console.log("Received on /notificate");
  if(typeof silent === "undefined" || typeof type === "undefined" || typeof senderName === "undefined" || typeof senderId === "undefined"){
    res.json({"Error":"Missing fields."});
    return;
  }
  if(type !== "newMessage" && type !== "newMeep" && type !== "newSecretMeep"){
    res.json({"Error":"Unrecognized type"});
    return;
  }
  var data = {
    "senderName": senderName,
    "senderId": senderId,
    "rootMeepId": rootMeepId,
    "silent": silent,
    "type": type
  };
  switch(type){
    case "newMessage":
      console.log("Received on newMessage");
      newMessage(res, rootMeepId, data);
      res.json({"Success":true});
      break;
    case "newMeep":
      console.log("Received on newMeep");
      newMeep(res, rootMeepId, data);
      res.json({"Success":true});
      break;
    case "newSecretMeep":
      console.log("Received on newSecretMeep");
      newMeep(res, rootMeepId, data);
      res.json({"Success":true});
      break;
    default:
      res.json({"Error":"Unknown"});
      return;
      break;
  }
});

app.listen(process.env.PORT || 5000);
