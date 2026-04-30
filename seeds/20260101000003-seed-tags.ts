import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const log = pino({
  name: 'seed-tags',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

// 與 BarTag / UserTag 的 boolean 欄位對應，方便 Gemini AI 配對推薦
const TAGS = ['運動', '音樂', '學生', '小酒館', '飲酒', '歡樂', '浪漫', '老派', '高檔', '輕鬆'];

export default async function seed(prisma: PrismaClient): Promise<void> {
  log.info('插入活動標籤...');

  for (const name of TAGS) {
    const existing = await prisma.tag.findFirst({ where: { name } });
    if (!existing) {
      await prisma.tag.create({ data: { name } });
    }
  }

  log.info(`完成：${TAGS.length} 個標籤`);
}
