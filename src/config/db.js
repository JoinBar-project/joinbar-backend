const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const dotenv = require('dotenv');

dotenv.config(); 
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(async client => {
    await client.query("SET TIME ZONE 'Asia/Taipei';");
    client.release(); // ⚠️ 一定要 release，否則連線會卡住
    console.log('✅ 資料庫已設定為 Asia/Taipei 時區');
  })
  .catch(err => {
    console.error('❌ 設定資料庫時區失敗:', err);
  });

// 建立 drizzle ORM
const db = drizzle(pool, { logger: true });

// 測試連線
pool.query('SELECT NOW()')
  .then(res => console.log('連線成功，現在時間是：', res.rows[0]))
  .catch(err => console.error('連線失敗：', err));

module.exports = db;

  
module.exports = db;