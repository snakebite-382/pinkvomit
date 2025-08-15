const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 100,
  host: process.env.databasehost,
  user: process.env.databaseuser,
  password: process.env.databasepassword,
  database: process.env.database
});

module.exports = pool;
