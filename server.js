var WebSocket = require("ws");
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 8088});
var express = require('express');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var cookie = require('cookie');
var cookieParser = require('cookie-parser')

var dbUrl = 'mongodb://localhost:27017/test2';

var app = express();
console.log("Server listening on port 3000");

var connectDb = function(operation){
    MongoClient.connect(dbUrl, function(err,db){
        assert.equal(null, err);
        operation(db);
    });
};

var sessionStore = new MongoStore({ url: dbUrl}); // reuse db for session storage

var cookieSecret = 'secret key';
// app.set('trust proxy', 1)
app.use(session({
    secret: cookieSecret,
        store: sessionStore,
        resave: false,
        saveUninitialized: true,
        cookie: { /*secure: true,*/ maxAge: null, httpOnly: false }
}));
app.use(bodyParser.json());
app.listen(3000);
app.use(express.static(__dirname + '/client'));

app.post('/addUser', function(request, response) {
    console.log(request.body);      // print json object
    var username = request.body.username;
    var password = request.body.password;

    connectDb(function (db) {
        db.collection("users").findOne({"username": username},
            function (err, collection) {
                if (collection) {
                    console.log("Username is taken");
                    response.json({"status": "taken"});
                }
                else {  
                    db.collection('users').insertOne( {"username": username, "password": password, "online": "false"});
                    console.log("User added to database");
                    db.close(); // Only close database if an user has been added (prevents instance pool destroyed error).
                    response.json({"status": "ok"});
                }
            });
    });
});

app.post('/login',function(request,response){
    console.log(request.body);      // print json object
    var username = request.body.username;
    var password = request.body.password;

    connectDb(function (db) {
        db.collection("users").findOne({ "username": username },
            function (err, collection) {
                if (collection) {
                    console.log("user exists");
                    if (collection.password == password){
                        console.log("login success");
                        request.session.user = username;
                        request.session.save();
                        response.json({"status": "ok"});
                    }
                    else{
                        console.log("wrong password");
                        response.json({"status": "wrong"});
                    }
                }
                else {
                    console.log("no user");
                    response.json({"status": "none"});
                }
            });
    });
});
// --------------------------- Home Screen --------------------------- \\
/*app.post('/find',function(request, response){
    console.log(request.body);      // print json object
    var username = request.body.username;

    connectDb(function (db) {
        db.collection("users").findOne({ "username": username },
            function (err, collection) {
                response.json({"name": collection.password});
            });
    });
});*/

app.post('/find',function(request, response){

    connectDb(function (db) {
        db.collection("users").find({}).toArray(function(err, documents){
            var users = [];
            for (var i = 0; i < documents.length; i++){
                users.push(documents[i].username);
            }
            response.json({"users": documents});
        });

    });
});

// --------------------------- change user online --------------------------- \\
app.post('/online',function(request, response){

    var username = request.body.username;
    var online = request.body.isOnline;

    connectDb(function (db) {
        var coll = db.collection("users");

        coll.updateOne({
            "username": username
        }, {
            $set: {
                "online": online
            }
        }, function(err, results) {
            console.log(results.result);
        });
        response.json({"response": "ok"});

        db.close();
    });
});


// --------------------------- Webrtc ------------------------- \\

var wsList = {};

wss.on('connection', function(ws, req){

    console.log(req.url)
    var cookies=cookie.parse(req.url.substr(1));
    console.log(cookies)
    var sid=cookieParser.signedCookie(cookies["connect.sid"],cookieSecret);
    sessionStore.get(sid,function(err, ss){
        sessionStore.createSession(req,ss)

        var user = ''
        if ('user' in req.session)
            user = req.session.user;
        else
            ws.close();

        if (user in wsList){
            ws.close()
            console.log('duplicate session for '+user);
        } else {
            ws.user = user;
            wsList[user] = ws;
            console.log('login success');
        }

        ws.on('close', function(){
            if (wsList[ws.user] === ws){
                delete wsList[ws.user];
                console.log('connection with '+ws.user+' was closed!');
            } else {
                console.log('new connection with '+ws.user+' was rejected!');
            }
        });

        ws.on('message', function(message){
            console.log('Got ws message: '+message);
            var Message = JSON.parse(message);
            if (Message.action == "offer"){
                Message.from = ws.user;
                message = JSON.stringify(Message);
            }
            var receiver = JSON.parse(message)['to'];
            if (receiver in wsList)
                wsList[receiver].send(message);
        });
    });
});

