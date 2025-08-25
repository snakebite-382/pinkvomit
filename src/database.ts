import mysql from 'mysql2/promise';
import settings from './config/database.js';
const pool = mysql.createPool(settings);
export default pool;
