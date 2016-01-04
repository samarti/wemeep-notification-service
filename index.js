'use strict'

var xmpp = require('node-xmpp-client');
var express = require('express');
var bodyParser = require('body-parser');
var request = require("request");
var Futures = require("fy
utures");

var jobPayload;
var xmppClient;
var connected = false;
var PORT = 8080;
var GCM_API_KEY = process.env.GCM_API_KEY;/*
var sessionServiceUrl = process.env.SESSION_SERVICE_URL;
var meepServiceUrl = process.env.MEEP_SERVICE_URL;*/

//var PORT = 8001;
var sessionServiceUrl = "http://ec2-54-233-116-227.sa-east-1.compute.amazonaws.com:4567";
var meepServiceUrl = "http://ec2-54-94-252-8.sa-east-1.compute.amazonaws.com:4567";/*
var GCM_API_KEY = "AIzaSyBAxUWFA6aNYnQvFHa8C_vjXv6aLdTHJ14";*/

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
xmppClient.connection.socket.setTimeout(0)
xmppClient.connection.socket.setKeepAlive(true, 10000)

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

function sendNotificationToDevice(to, message) {
  var payload = {
      "to": to,
      "message_id": Date.now() + "",
      "data": message,
      "time_to_live": 0,
      "delay_while_idle": false
  };
  var jsonPayload = JSON.stringify(payload);
  var someId = Date.now();
  var ackToDevice = new xmpp.Element('message', {'id': someId}).c('gcm', {xmlns: 'google:mobile:data'}).t(jsonPayload);
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
            sendNotificationToDevice(resData.gcmId, data);
          }
        });
      }
  });
}

app.post('/notificate', function(req, res){
  var silent = req.body.silent;
  var type = req.body.type;
  var senderName = req.body.senderName;
  var senderId = req.body.senderId;
  var rootMeepId = req.body.rootMeepId;
  var meepComment = req.body.meepComment;

  if(typeof silent === "undefined" || typeof type === "undefined" || typeof senderName === "undefined" || typeof senderId === "undefined"){
    res.json({"Error":"Missing fields."});
    return;
  }
  if(type !== "newMessage" && type !== "newMeep"){
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
      newMessage(res, rootMeepId, data);
      res.json({ "Success": "Sent"});
      break;
    case "newMeep":
      res.json({ "Error": "not implemented"});
      break;
    default:
      res.json({"Error":"Unknown"});
      return;
      break;
  }
});

app.listen(PORT);
