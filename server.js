/**
 * Created by PederGB on 11.03.2017.
 */
var express = require('express');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://localhost:27017/test';

var app = express();
console.log("Server listening on port 3000");

app.use(bodyParser.json());
app.listen(3000);
app.use(express.static(__dirname + '/client'));


app.post('/addUser', function(request, response) {
    console.log(request.body);      // print json object
    var username = request.body.username;
    var password = request.body.password;
    response.send(request.body);

    connectDb(function (db) {
        db.collection("users").findOne({"username": username},
            function (err, collection) {
                if (collection) {
                    console.log("Username is taken")
                }
                else {  
                    db.collection('users').insertOne( {"username": username, "password": password});
                    console.log("User added to database");
                    db.close(); // Only close database if an user has been added (prevents instance pool destroyed error).
                }
            });
    });
});

var connectDb = function(operation){
    MongoClient.connect(url, function(err,db){
        assert.equal(null, err);
        operation(db);
    });
};
