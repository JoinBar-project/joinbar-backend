import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import pino from 'pino';
import { getEnv } from '../src/infrastructure/validate-env';

const log = pino({
  name: 'seed-admin',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

export default async function seed(prisma: PrismaClient): Promise<void> {
  const env = getEnv();

  if (!env.ADMIN_DEFAULT_EMAIL || !env.ADMIN_DEFAULT_PASSWORD) {
    throw new Error(
      'seed-admin 需要明示設定 ADMIN_DEFAULT_EMAIL 與 ADMIN_DEFAULT_PASSWORD（密碼至少 12 字元）',
    );
  }

  const adminEmail = env.ADMIN_DEFAULT_EMAIL;
  const adminPassword = env.ADMIN_DEFAULT_PASSWORD;

  log.info('插入管理員帳號...');

  // 使用 env.BCRYPT_ROUNDS 與 production 規則一致（≥ 12）
  const passwordHash = await bcrypt.hash(adminPassword, env.BCRYPT_ROUNDS);

  const user = await prisma.userRecord.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      username: '管理員',
      email: adminEmail,
      role: 'ADMIN',
    },
  });

  await prisma.userAuthProvider.upsert({
    where: { userId_provider: { userId: user.id, provider: 'EMAIL' } },
    update: {
      password: passwordHash,
      email: adminEmail,
      isVerified: true,
    },
    create: {
      userId: user.id,
      provider: 'EMAIL',
      email: adminEmail,
      password: passwordHash,
      isVerified: true,
    },
  });

  log.info(`完成：管理員（${adminEmail}）`);
}
