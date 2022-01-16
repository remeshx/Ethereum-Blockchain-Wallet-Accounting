const mysql = require('mysql'); 
const dbConfig = require('../../config/database');

const db = mysql.createConnection(dbConfig);


db.connect(function(err) {
    if (err) {
      console.log('Error connecting to db!',err);
      //throw err;
      process.exit(0);
    }
    console.log("Connected!");
  });

module.exports = db;

