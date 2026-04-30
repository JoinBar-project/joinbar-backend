import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const log = pino({
  name: 'seed-bars',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

const BARS = [
  {
    name: 'Draft Land',
    address: '台北市大安區忠孝東路四段248巷2號',
    latitude: 25.041927,
    longitude: 121.550537,
  },
  {
    name: 'Bar Mood Taipei',
    address: '台北市大安區敦化南路一段160巷53號',
    latitude: 25.041085,
    longitude: 121.550352,
  },
  {
    name: 'Indulge Bistro',
    address: '台北市大安區復興南路一段219巷11號',
    latitude: 25.039379,
    longitude: 121.544761,
  },
  {
    name: 'Wa-Shu 和酒',
    address: '台北市大安區忠孝東路四段101巷39號',
    latitude: 25.04358,
    longitude: 121.5484,
  },
  {
    name: 'Fake Sober Taipei',
    address: '台北市信義區松壽路20號',
    latitude: 25.035428,
    longitude: 121.567454,
  },
  {
    name: 'ABV Bar & Kitchen',
    address: '台北市大安區光復南路260巷39號',
    latitude: 25.040309,
    longitude: 121.555676,
  },
  {
    name: 'Barcode',
    address: '台北市信義區松壽路22號5樓',
    latitude: 25.035668,
    longitude: 121.567898,
  },
  {
    name: 'Alchemy Speakeasy',
    address: '台北市信義區信義路五段16-1號2樓',
    latitude: 25.032733,
    longitude: 121.563248,
  },
  {
    name: 'Revolver',
    address: '台北市中正區羅斯福路一段1-2號',
    latitude: 25.042545,
    longitude: 121.519878,
  },
  {
    name: '榕 RON Xinyi',
    address: '台北市信義區基隆路二段12號',
    latitude: 25.032415,
    longitude: 121.558898,
  },
  {
    name: 'GumGum Beer & Wings',
    address: '台北市信義區光復南路473巷11弄38號',
    latitude: 25.034186,
    longitude: 121.559192,
  },
  {
    name: 'Room by Le Kief',
    address: '台北市大安區和平東路三段68號1樓',
    latitude: 25.024556,
    longitude: 121.550156,
  },
  {
    name: '星夜 Starry night Bar',
    address: '台北市大同區長安西路89號',
    latitude: 25.051357,
    longitude: 121.516541,
  },
  {
    name: 'Muzeo Gastronomy&Draft',
    address: '台北市大安區忠孝東路四段170巷6弄14號',
    latitude: 25.04108,
    longitude: 121.550095,
  },
  {
    name: 'PUN',
    address: '台北市大安區信義路四段378巷5號1樓',
    latitude: 25.032905,
    longitude: 121.555818,
  },
];

// 每間酒吧的標籤組合
const BAR_TAGS: Record<
  string,
  Partial<
    Record<
      | 'sport'
      | 'music'
      | 'student'
      | 'bistro'
      | 'drink'
      | 'joy'
      | 'romantic'
      | 'oldschool'
      | 'highlevel'
      | 'easy',
      boolean
    >
  >
> = {
  'Draft Land': { music: true, drink: true, joy: true, easy: true },
  'Bar Mood Taipei': { music: true, romantic: true, highlevel: true },
  'Indulge Bistro': {
    bistro: true,
    romantic: true,
    highlevel: true,
    easy: true,
  },
  'Wa-Shu 和酒': { music: true, oldschool: true, drink: true },
  'Fake Sober Taipei': { music: true, joy: true, drink: true, easy: true },
  'ABV Bar & Kitchen': { bistro: true, drink: true, easy: true },
  Barcode: { music: true, joy: true, highlevel: true },
  'Alchemy Speakeasy': { oldschool: true, romantic: true, highlevel: true },
  Revolver: { music: true, student: true, joy: true, easy: true },
  '榕 RON Xinyi': { bistro: true, romantic: true, highlevel: true },
  'GumGum Beer & Wings': { sport: true, joy: true, drink: true, easy: true },
  'Room by Le Kief': { romantic: true, highlevel: true, easy: true },
  '星夜 Starry night Bar': { music: true, romantic: true, oldschool: true },
  'Muzeo Gastronomy&Draft': { bistro: true, music: true, drink: true },
  PUN: { bistro: true, highlevel: true, romantic: true },
};

const DEFAULT_TAG = {
  sport: false,
  music: false,
  student: false,
  bistro: false,
  drink: false,
  joy: false,
  romantic: false,
  oldschool: false,
  highlevel: false,
  easy: false,
};

export default async function seed(prisma: PrismaClient): Promise<void> {
  log.info('插入酒吧資料...');
  let count = 0;

  for (const bar of BARS) {
    const existing = await prisma.bar.findFirst({ where: { name: bar.name } });
    if (existing) continue;

    const created = await prisma.bar.create({
      data: {
        name: bar.name,
        address: bar.address,
        latitude: bar.latitude,
        longitude: bar.longitude,
      },
    });

    const tagOverrides = BAR_TAGS[bar.name] ?? {};
    await prisma.barTag.create({
      data: { barId: created.id, ...DEFAULT_TAG, ...tagOverrides },
    });

    count++;
  }

  log.info(`完成：新增 ${count} 間酒吧（已存在的跳過）`);
}
