const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const dotenv = require('dotenv');

dotenv.config(); 
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, {logger: true});

pool.query('SELECT NOW()')
  .then(res => console.log('連線成功，現在時間是：', res.rows[0]))
  .catch(err => console.error('連線失敗：', err));
  
module.exports = db;