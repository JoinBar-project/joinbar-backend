import { Client } from 'pg';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const log = pino({
  name: 'drop-database',
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

const dropDatabase = async (): Promise<void> => {
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
    // 先踢掉所有連線，避免 "database is being accessed by other users" 錯誤
    await client.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [DB_DATABASE],
    );

    await client.query(`DROP DATABASE IF EXISTS "${DB_DATABASE}"`);
    log.info(`資料庫 "${DB_DATABASE}" 刪除成功！`);
  } finally {
    await client.end();
  }
};

void dropDatabase().catch((e) => {
  log.error({ err: e }, '刪除資料庫時發生錯誤');
  process.exit(1);
});
