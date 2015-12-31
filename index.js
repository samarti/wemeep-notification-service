'use strict'

var xmpp = require('node-xmpp-client');
var express = require('express');
var bodyParser = require('body-parser');

var jobPayload;
var xmppClient;
var connected = false;
var PORT = 8080;
//var PORT = 8001;
var GCM_API_KEY = process.env.GCM_API_KEY;
//var GCM_API_KEY = "AIzaSyBAxUWFA6aNYnQvFHa8C_vjXv6aLdTHJ14";
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

function sendNotificationToDevice(id, to, message) {
  var payload = {
      "to": to,
      "message_id": id + "",
      "data": {"message":message},
      "time_to_live": 0,
      "delay_while_idle": false
  };
  var jsonPayload = JSON.stringify(payload);
  console.log(jsonPayload);
  var ackToDevice = new xmpp.Element('message', {'id': id}).c('gcm', {xmlns: 'google:mobile:data'}).t(jsonPayload);
  xmppClient.send(ackToDevice);
}

function sendNotificationToTopic(id, topic, message) {
  var payload = {
      "to": "topics/" + topic,
      "message_id": id,
      "data": {"message":message},
      "time_to_live": 0,
      "delay_while_idle": false
  };
  var jsonPayload = JSON.stringify(payload);
  var ackToDevice = new xmpp.Element('message', {'id': id}).c('gcm', {xmlns: 'google:mobile:data'}).t(jsonPayload);
  xmppClient.send(ackToDevice);
}

xmppClient.on('online', function() {
    connected = true;
});

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.post('/notifdevice', function(req, res){
  var to = req.body.to;
  var id = req.body.id;
  var message = req.body.message;
  sendNotificationToDevice(id, to, message);
  res.json({ "status": "received"});
});

app.post('/notiftopic', function(req, res){
  var message = req.body.message;
  var id = req.body.id;
  var topic = req.body.topic;
  sendNotificationToTopic(id, topic, message);
  res.json({ "status": "received"});
});

app.listen(PORT);
