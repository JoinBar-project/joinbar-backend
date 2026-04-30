import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';

dotenv.config();

// production 環境誤投入防止（需明示 ALLOW_PROD_SEED=1 才放行）
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
  console.error(
    '[seed-runner] Seeding is disabled in production. Set ALLOW_PROD_SEED=1 to override.',
  );
  process.exit(1);
}

const log = pino({
  name: 'seed-runner',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

// Prisma v7 PrismaClientOptions 不再接受 datasourceUrl；需在建構前設定 DATABASE_URL
if (!process.env.DATABASE_URL) {
  const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } = process.env;
  process.env.DATABASE_URL = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
}

// Prisma v7 "client" engine 需要 driver adapter；不能再用舊式 library engine
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const run = async (): Promise<void> => {
  const seedsDir = path.join(__dirname, '../seeds');

  const files = fs
    .readdirSync(seedsDir)
    .filter((f) => f.endsWith('.ts'))
    .sort(); // timestamp prefix 確保順序

  // 取得已執行記錄，跳過已完成的
  const executed = await prisma.seedHistoryRecord.findMany({
    select: { seedName: true },
  });
  const executedNames = new Set(executed.map((e) => e.seedName));
  const pending = files.filter((f) => !executedNames.has(f));

  log.info(
    `seed 檔案 ${files.length} 個、已執行 ${executed.length} 個、待執行 ${pending.length} 個`,
  );

  if (pending.length === 0) {
    log.info('沒有需要執行的 seed');
    return;
  }

  for (const file of pending) {
    log.info(`執行 ${file}`);
    const seedModule = (await import(path.join(seedsDir, file))) as {
      default: (prisma: PrismaClient) => Promise<void>;
    };
    await seedModule.default(prisma);

    // 成功後寫入 seed_history，避免下次重複執行
    await prisma.seedHistoryRecord.create({ data: { seedName: file } });
    log.info(`[done] ${file} 完成`);
  }

  log.info('全部執行完成！');
};

run()
  .catch((e) => {
    log.error({ err: e }, '執行失敗');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
