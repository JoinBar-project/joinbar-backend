import { Client } from 'pg';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const log = pino({
  name: 'create-database',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;

if (!DB_DATABASE) {
  log.error('DB_DATABASE is not set in .env');
  process.exit(1);
}

const createDatabase = async (): Promise<void> => {
  // postgres 預設資料庫連線，不指定目標 DB
  const client = new Client({
    host: DB_HOST || 'localhost',
    port: parseInt(DB_PORT || '5432', 10),
    user: DB_USERNAME || 'postgres',
    password: DB_PASSWORD || '',
    database: 'postgres',
  });

  await client.connect();
  log.info('已連線到 PostgreSQL 伺服器');

  try {
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_DATABASE],
    );

    if ((res.rowCount ?? 0) === 0) {
      // CREATE DATABASE 不能在 transaction 內執行
      await client.query(`CREATE DATABASE "${DB_DATABASE}"`);
      log.info(`資料庫 "${DB_DATABASE}" 建立成功！`);
    } else {
      log.info(`資料庫 "${DB_DATABASE}" 已存在`);
    }
  } finally {
    await client.end();
  }
};

void createDatabase().catch((e) => {
  log.error({ err: e }, '建立資料庫時發生錯誤');
  process.exit(1);
});
