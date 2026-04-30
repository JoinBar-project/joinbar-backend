import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import pino from 'pino';

const log = pino({
  name: 'seed-admin',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

const BCRYPT_ROUNDS = 10;
const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@test.com';
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin1234!';

export default async function seed(prisma: PrismaClient): Promise<void> {
  log.info('插入管理員帳號...');

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

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
