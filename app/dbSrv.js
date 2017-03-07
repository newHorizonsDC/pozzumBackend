var assert = require('assert');

(function() {
  var dbSrv = {
    insertUser: function(db, username, password, callback) {
      db.collection('users').insertOne( {
        "username" : username,
        "password" : password
      }, function(err, result) {
        assert.equal(err, null);
        console.log("Inserted a user into the database.");
        callback();
      });
    },
    validatePassword: function(db, username, password, callback) {
      var cursor =db.collection('users').find({"username": username});
      cursor.each(function(err, doc) {
        assert.equal(err, null);
        if (doc != null) {
          console.dir(doc);
        } else {
          callback();
        }
      });
    }
  };


  module.exports.db = function() {
    return dbSrv;
  }

}());
