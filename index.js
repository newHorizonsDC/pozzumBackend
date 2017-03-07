// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// Setup mongodb
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/test';
var crypto = require('crypto');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Server files
var dbSrv = require('./app/dbSrv');

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;
    password = crypto.createHmac('sha256', 'passord').digest('hex');

    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      dbSrv.db().insertUser(db, username, password, function() {
        db.close();
      });
    });

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  socket.on('attempt login', function (username, password) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      sbSrv.db().validatePassword(db, username, password, function() {
        db.close();
      });
    });
  });


  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the client emits 'start vibrating', we broadcast it to others
  socket.on('start vibrating', function () {
    socket.broadcast.emit('start vibrating', {
      username: socket.username
    });
  });

  // when the client emits 'stop vibrating', we broadcast it to others
  socket.on('stop vibrating', function () {
    socket.broadcast.emit('stop vibrating', {
      username: socket.username
    });
    console.log(socket.username + " vibrated");
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
