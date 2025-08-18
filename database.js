const mysql = require('mysql2/promise');
const settings = require('./config/database.js')
const pool = mysql.createPool(settings);


module.exports = pool;
