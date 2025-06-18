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
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fbrown-bar.jpg?alt=media&token=686729e7-dea8-4968-8244-ad35193edf0b",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fdblue-bar.jpg?alt=media&token=af41fbc7-70a9-4145-9c3e-b89d8f849d32",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fgreen-bar.jpg?alt=media&token=979fbe1a-b872-428a-84dc-90e8f0fa77b6",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Forange-bar.jpg?alt=media&token=a769183f-5179-46f4-95ef-08b821fbd748",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fpink-bar.jpg?alt=media&token=eb06b153-3b05-4b39-ab49-7c25c496edc3",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Ftiffany-bar.jpg?alt=media&token=7a1167e5-23b5-4722-b6da-b61425d4b146",
  "https://firebasestorage.googleapis.com/v0/b/joinbar-2cf9f.firebasestorage.app/o/events%2Fyellow-bar.jpg?alt=media&token=38320184-af49-4274-94e2-2f76b9ec31b9",
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
];

// 
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

  try {
    for (let i = 0; i < 20; i++) {
      const id = intformat(flake.next(), 'dec');
      const startAt = dayjs(faker.date.soon()).tz(tz).toDate();
      const endAt = dayjs(startAt).add(2, 'hour').tz(tz).toDate();

      // 交錯使用 hostUser 1 or 2
      const hostUser = i % 2 === 0 ? 1 : 2;
      const price = hostUser === 2 ? 500 : 0;

      const name = faker.helpers.arrayElement(eventNames);
      const barName = faker.helpers.arrayElement(barNames);
      const location = generateTaiwanAddress();

      // 隨機 1～2 個不重複 tagId
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