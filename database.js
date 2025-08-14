const mysql = require('mysql');
const connection = mysql.createConnection({
  host: process.env.databasehost,
  user: process.env.databaseuser,
  password: process.env.databasepassword,
  database: process.env.database
});

module.exports = connection;
