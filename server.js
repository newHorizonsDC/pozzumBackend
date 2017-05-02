/**
 * Created by PederGB on 11.03.2017.
 */
var express = require('express');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://localhost:27017/test2';

var app = express();
console.log("Server listening on port 3000");

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
                    db.collection('users').insertOne( {"username": username, "password": password});
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

// --------------------------- Chat --------------------------- \\
//TODO lol..

var connectDb = function(operation){
    MongoClient.connect(url, function(err,db){
        assert.equal(null, err);
        operation(db);
    });
};
