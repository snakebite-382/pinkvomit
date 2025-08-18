const mysql = require('mysql2/promise');
const settings = {
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  host: process.env.databasehost,
  user: process.env.databaseuser,
  password: process.env.databasepassword,
  database: process.env.database
}
const pool = mysql.createPool(settings);


module.exports = pool;
