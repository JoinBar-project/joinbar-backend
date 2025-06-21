const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const { Faker, zh_TW } = require('@faker-js/faker');
const db = require('../config/db');
const { events, eventTags } = require('../models/schema');
const { dayjs, tz } = require('../utils/dateFormatter');

const faker = new Faker({ locale: [zh_TW] });
const flake = new FlakeId({ id: 1 });

// ✅ Firebase 圖片 URL 陣列（請使用你自己的真實圖片）
const firebaseImageUrls = [
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-01.jpg?alt=media&token=2b7a7e6f-fdf2-43c7-a61c-5b9859fe5083",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-02.jpg?alt=media&token=b48214d3-695f-4df8-a152-cd34780ea090",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-03.jpg?alt=media&token=8a75678d-d0d4-40a8-83b9-d278de6fb676",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-04.jpg?alt=media&token=fb02886c-fadb-470d-a713-768ae648816d",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-05.jpg?alt=media&token=be220c2a-40a5-4bf5-9b7e-b5e1b5fd0c3b",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-06.jpg?alt=media&token=82f80d24-4854-4e0a-9fdf-589420a17f86",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-07.jpg?alt=media&token=8e29ab6d-9c67-4ab8-91af-086b53aa4e8d",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-08.jpg?alt=media&token=febdd940-c4e5-4bff-b21d-a182313b31fe",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-09.jpg?alt=media&token=dfdae620-5988-4dc5-b9cc-e3ea20706ec0",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-10.jpg?alt=media&token=f1eb7e8f-c88f-4e39-9dee-ac15daec1fc1",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fevent-11.jpg?alt=media&token=bdebf59b-6611-4baf-b0c7-3bbaca8cbba6",
];

//  活動標籤
const existingTagIds = [1, 2, 3, 4, 5, 6];

//  活動名稱
const eventNames = [
  '這是活動標題限定顯示兩行以內不然真的太多放不下啦嗚拉呀哈~超過會顯示...',
  '失戀無罪喝酒團，酒量不拘(只要願意陪我喝)單身狗限定報名，已婚賣來亂QQ...',
  '周末CHILL調酒Day，藍調爵士抒情夜，入場免費招待SHOT，歡迎加入...',
  '今晚來場單身配對調酒局，喝醉不尷尬～尷尬的是沒人約你乾杯...',
  '想忘記那個爛人？快來陪我尬酒，這裡不療傷，只喝到斷片為止...',
  '週末限定LIVE電音＋調酒買一送一，沒人嗨你就上台跳一段也行...',
  '上班超悶？週五來當廢物爽喝一波，大家一起社畜乾杯大解放...',
  '不想面對人生？這裡只講幹話不談夢想，進場就發你兩杯先喝...',
  '喝酒失戀療癒大會：不准提前走，只准提前醉，失控我們扛',
  '你說你戒酒？那是昨天的你！今晚我們無酒不歡不見不散',
  '人生太難今晚別清醒：限時三小時酗酒＋講幹話大賽開跑',
  '酒後吐真言實錄：醉到講出對前任的真心話就請你喝一杯',
  '社交障礙者專屬酒場：你不說話沒關係，讓Shot替你打招呼',
  '爛片不如來爛醉：邊看愛情電影邊罵髒話邊乾杯療傷夜',
  '不想早起？那就晚點回家：午夜過後才開始的續攤行程局',
  '喝醉也要保持浪漫：燭光、花香與低級笑話混搭的迷幻夜',
  '我們只想喝到世界暫停：手機收起，酒杯舉起，全場自由喊醉',
  '找酒友比找對象還難？今晚就是你的交友＋酗酒聯誼場',
];

const officialEventNames = [
  '國際精釀風味巡禮：探索世界六大洲獨特啤酒文化盛會',
  '仲夏露天啤酒花園派對：音樂、美食與微醺夜晚的完美結合',
  '台灣本土釀酒品牌聯展：在地麥香與創新風味交會的品酌饗宴',
  '比利時修道院啤酒品味之旅：百年傳統與神祕工藝的深度對話',
  '精釀創客週末市集：酒廠主理人帶你走進手作啤酒的釀造世界',
  '山林秘境微醺營火夜：與手工拉格共度寧靜星空的沉醉時光',
  '港口城市工業風釀酒節：復古鐵皮倉庫中的極致酒香盛宴',
  '深夜拉格哲學品飲會：在燈光與爵士中解構酒體的香氣層次',
  '德國十月啤酒節復刻大典：傳統服飾、音樂與濃郁麥香交織重現',
  '女性限定花果風啤酒工作坊：為妳量身調製的香氣實驗酒款',
  '亞太區獨立釀酒師競技展演：百款風格啤酒一次品味的挑戰場',
  '北歐黑麥風味日：厚重酒體與嚴冬文化交織的品飲沉浸體驗',
  '高空景觀啤酒之夜：城市夜燈下的手工精釀與輕電音交響',
  '文化老屋 x 啤酒對話沙龍：從建築到酒香的時間共鳴饗宴',
  '荒野露營微醺週末：與三五好友共享酒香、火光與風聲夜語',
  '音樂人私釀公開秀：獨立樂團與手工啤酒的創作靈魂聯名夜',
  '街頭美食與精釀酒快閃市集：探索風味搭配的無限可能性',
  '職人啤酒實驗室開放日：親手釀製屬於你的第一桶風味麥汁',
  '啤酒風味跨界論壇：調酒、甜點、咖啡職人齊聚的品酌交流會',
  '城市微醺馬拉松活動：串連 10 間人氣酒吧的限量杯緣巡飲計畫',
];

const taiwanCities = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '基隆市',
];

const taiwanRoads = [
  '中山路', '民權路', '忠孝路', '中正路', '和平路',
  '復興路', '建國路', '信義路', '文化路', '民族路'
];

function generateTaiwanAddress() {
  const city = faker.helpers.arrayElement(taiwanCities);
  const road = faker.helpers.arrayElement(taiwanRoads);
  const number = faker.number.int({ min: 1, max: 500 });
  return `${city}${road}${number}號`;
}

const barNames = [
  '微醺酒館', '酒後人生', '午夜小酌屋', '調酒研究室', '夜貓子Bar',
  '單身俱樂部', '藍色迷霧', '醉後不留名', '迷失之夜', '午夜微光',
  '伏特加星球', '啤酒河岸', '喧囂之島', '假面酒吧', '烈酒地窖',
  '酒話連篇', '不醉不歸所', '深夜乾杯', 'Bar Time', '無名酒館',
  '酒神夜宴', 'Shot一波', '放空俱樂部', '解憂BAR所', '私語之間',
  '忘憂地帶', '酒力全開', '黑糖酒館', '微光酒場', '今晚不回家'
];

async function seedEvents() {
  const now = dayjs().tz(tz).toDate();

  const hostUserList = faker.helpers.shuffle([
    ...Array(10).fill(1), // 官方
    ...Array(10).fill(2), // 一般
  ]);

  const shuffledOfficialTitles = faker.helpers.shuffle(officialEventNames).slice(0, 10);
  let officialTitleIndex = 0;

  try {
    for (let i = 0; i < 20; i++) {
      const id = intformat(flake.next(), 'dec');
      const startAt = dayjs(faker.date.soon()).tz(tz).toDate();
      const endAt = dayjs(startAt).add(2, 'hour').tz(tz).toDate();

      const hostUser = hostUserList[i];
      const isOfficial = hostUser === 1;
      const price = isOfficial ? 500 : 0;

      const name = isOfficial
        ? shuffledOfficialTitles[officialTitleIndex++]
        : faker.helpers.arrayElement(eventNames);

      const barName = faker.helpers.arrayElement(barNames);
      const location = generateTaiwanAddress();

      const selectedTags = faker.helpers.arrayElements(existingTagIds, { min: 1, max: 2 });

      await db.insert(events).values({
        id,
        name,
        barName,
        location,
        startAt,
        endAt,
        maxPeople: faker.number.int({ min: 10, max: 50 }),
        imageUrl: faker.helpers.arrayElement(firebaseImageUrls),
        price,
        hostUser,
        createAt: now,
        modifyAt: now,
        status: 1,
      });

      const tagRelations = selectedTags.map(tagId => ({
        eventId: id,
        tagId,
      }));

      await db.insert(eventTags).values(tagRelations);
    }

    console.log('✅ 活動與標籤關聯資料建立完成');
  } catch (err) {
    console.error('❌ 建立活動資料失敗:', err);
  }
}

seedEvents();