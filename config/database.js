require('dotenv').config();

module.exports = {
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  host: process.env.databasehost,
  user: process.env.databaseuser,
  password: process.env.databasepassword,
  database: process.env.database
}
