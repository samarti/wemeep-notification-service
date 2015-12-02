'use strict'

var express = require('express');
// Constants
var PORT = 8080;

// App
var app = express();
app.get('/', function (req, res) {
  res.send('Hello world\n');
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);

var Server = require('node-xmpp-server')
var server = null
var xmpp = require('node-xmpp-client')

var options = {
  type: 'client',
  jid: '124076137297@gcm.googleapis.com',
  password: 'AIzaSyBAxUWFA6aNYnQvFHa8C_vjXv6aLdTHJ14',
  port: 5235,
  host: 'gcm.googleapis.com',
  legacySSL: true,
  preferredSaslMechanism : 'PLAIN'
};

console.log("Creating XMPP Application");

var cl = new xmpp.Client(options);

cl.on('online', function()
{
    console.log("XMPP Online");
});
