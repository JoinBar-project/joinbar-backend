import { PrismaClient } from '@prisma/client';
import { Faker, zh_TW, en } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import pino from 'pino';

const log = pino({
  name: 'seed-events',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

const faker = new Faker({ locale: [zh_TW, en] });

const FIREBASE_IMAGE_URLS = [
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-01.jpg?alt=media&token=2b7a7e6f-fdf2-43c7-a61c-5b9859fe5083',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-02.jpg?alt=media&token=b48214d3-695f-4df8-a152-cd34780ea090',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-03.jpg?alt=media&token=8a75678d-d0d4-40a8-83b9-d278de6fb676',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-04.jpg?alt=media&token=fb02886c-fadb-470d-a713-768ae648816d',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-05.jpg?alt=media&token=be220c2a-40a5-4bf5-9b7e-b5e1b5fd0c3b',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-06.jpg?alt=media&token=82f80d24-4854-4e0a-9fdf-589420a17f86',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-07.jpg?alt=media&token=8e29ab6d-9c67-4ab8-91af-086b53aa4e8d',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-08.jpg?alt=media&token=febdd940-c4e5-4bff-b21d-a182313b31fe',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-09.jpg?alt=media&token=dfdae620-5988-4dc5-b9cc-e3ea20706ec0',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-10.jpg?alt=media&token=f1eb7e8f-c88f-4e39-9dee-ac15daec1fc1',
  'https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-11.jpg?alt=media&token=bdebf59b-6611-4baf-b0c7-3bbaca8cbba6',
];

const EVENT_NAMES_CASUAL = [
  '失戀無罪喝酒團，酒量不拘(只要願意陪我喝)單身狗限定報名',
  '周末CHILL調酒Day，藍調爵士抒情夜，入場免費招待SHOT',
  '今晚來場單身配對調酒局，喝醉不尷尬～尷尬的是沒人約你乾杯',
  '想忘記那個爛人？快來陪我尬酒，這裡不療傷，只喝到斷片為止',
  '週末限定LIVE電音＋調酒買一送一，沒人嗨你就上台跳一段也行',
  '上班超悶？週五來當廢物爽喝一波，大家一起社畜乾杯大解放',
  '不想面對人生？這裡只講幹話不談夢想，進場就發你兩杯先喝',
  '你說你戒酒？那是昨天的你！今晚我們無酒不歡不見不散',
  '社交障礙者專屬酒場：你不說話沒關係，讓Shot替你打招呼',
  '找酒友比找對象還難？今晚就是你的交友＋酗酒聯誼場',
];

const EVENT_NAMES_OFFICIAL = [
  '國際精釀風味巡禮：探索世界六大洲獨特啤酒文化盛會',
  '仲夏露天啤酒花園派對：音樂、美食與微醺夜晚的完美結合',
  '台灣本土釀酒品牌聯展：在地麥香與創新風味交會的品酌饗宴',
  '比利時修道院啤酒品味之旅：百年傳統與神祕工藝的深度對話',
  '精釀創客週末市集：酒廠主理人帶你走進手作啤酒的釀造世界',
  '德國十月啤酒節復刻大典：傳統服飾、音樂與濃郁麥香交織重現',
  '高空景觀啤酒之夜：城市夜燈下的手工精釀與輕電音交響',
  '荒野露營微醺週末：與三五好友共享酒香、火光與風聲夜語',
  '音樂人私釀公開秀：獨立樂團與手工啤酒的創作靈魂聯名夜',
  '職人啤酒實驗室開放日：親手釀製屬於你的第一桶風味麥汁',
];

export default async function seed(prisma: PrismaClient): Promise<void> {
  log.info('插入測試活動...');

  // 取得管理員帳號作為官方活動 host
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@test.com';
  const adminUser = await prisma.userRecord.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    log.warn('找不到管理員帳號，請先執行 seed-admin。跳過活動 seed。');
    return;
  }

  // 建立 5 位測試一般使用者作為活動 host
  const testUsers = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const email = `testuser${i + 1}@joinbar.test`;
      const existing = await prisma.userRecord.findUnique({ where: { email } });
      if (existing) return existing;

      const user = await prisma.userRecord.create({
        data: {
          username: faker.person.fullName(),
          email,
          role: 'USER',
        },
      });
      const pw = await bcrypt.hash('Test1234!', 8);
      await prisma.userAuthProvider.create({
        data: {
          userId: user.id,
          provider: 'EMAIL',
          email,
          password: pw,
          isVerified: true,
        },
      });
      return user;
    }),
  );

  // 取得所有酒吧與標籤
  const bars = await prisma.bar.findMany();
  const tags = await prisma.tag.findMany();

  if (bars.length === 0) {
    log.warn('找不到酒吧資料，請先執行 seed-bars。跳過活動 seed。');
    return;
  }

  // 建立 20 個活動（10 官方＋10 一般）
  const officialNames = faker.helpers.shuffle(EVENT_NAMES_OFFICIAL).slice(0, 10);
  const casualNames = faker.helpers.shuffle(EVENT_NAMES_CASUAL).slice(0, 10);

  let count = 0;
  for (let i = 0; i < 20; i++) {
    const isOfficial = i < 10;
    const hostUser = isOfficial ? adminUser : faker.helpers.arrayElement(testUsers);
    const bar = faker.helpers.arrayElement(bars);
    const startAt = faker.date.soon({ days: 30 });
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // +2h

    const event = await prisma.eventRecord.create({
      data: {
        name: isOfficial ? officialNames[i] : casualNames[i - 10],
        barId: bar.id,
        barName: bar.name,
        location: bar.address ?? bar.name,
        startAt,
        endAt,
        maxPeople: faker.number.int({ min: 10, max: 50 }),
        imageUrl: faker.helpers.arrayElement(FIREBASE_IMAGE_URLS),
        price: isOfficial ? 500 : 0,
        hostUser: hostUser.id,
      },
    });

    // 隨機指派 1-2 個標籤
    if (tags.length > 0) {
      const selectedTags = faker.helpers.arrayElements(tags, { min: 1, max: 2 });
      await prisma.eventTag.createMany({
        data: selectedTags.map((t: { id: string }) => ({ eventId: event.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    count++;
  }

  log.info(`完成：新增 ${count} 個活動`);
}
