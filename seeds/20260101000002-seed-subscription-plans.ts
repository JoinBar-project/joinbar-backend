import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const log = pino({
  name: 'seed-subscription-plans',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

const PLANS = [
  {
    name: '小資月卡',
    subType: 'monthly',
    price: 999,
    durationDays: 30,
    description: 'VIP 專屬特調 1 次、合作酒吧招待飲品 1 次、合作酒吧招待小點 1 次',
    isActive: true,
  },
  {
    name: '季訂方案',
    subType: 'seasonal',
    price: 1999,
    durationDays: 90,
    description: 'VIP 專屬特調 2 次、合作酒吧招待飲品 3 次、合作酒吧招待小點 3 次',
    isActive: true,
  },
  {
    name: '尊爵黑卡',
    subType: 'vip',
    price: 2999,
    durationDays: 365,
    description: 'VIP 專屬特調 3 次、合作酒吧招待飲品 6 次、合作酒吧招待小點 6 次',
    isActive: true,
  },
];

export default async function seed(prisma: PrismaClient): Promise<void> {
  log.info('插入訂閱方案...');

  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { subType: plan.subType },
      update: {
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        description: plan.description,
      },
      create: plan,
    });
  }

  log.info(`完成：${PLANS.length} 個方案`);
}
