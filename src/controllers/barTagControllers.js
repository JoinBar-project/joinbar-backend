const db = require('../config/db');
// tags, barTags：從 schema 匯入的兩張資料表。barTags 是多對多關聯表（bar 和 tag 的對應關係）
const { userTags, barTags ,barsTable } = require('../models/schema');
const { eq, and ,inArray} = require('drizzle-orm');

// 新增標籤到個人推薦
const addTagsToUser = async (req, res) => {
  const userId = Number(req.params.id);
  const inputTags = req.body;

  // 驗證輸入欄位，只取固定 10 個標籤
  const VALID_TAG_KEYS = ['sport', 'music', 'student', 'bistro', 'drink', 'joy', 'romantic', 'oldschool', 'highlevel', 'easy'];
  const validTags = {};
  for (const key of VALID_TAG_KEYS) {
    validTags[key] = !!inputTags[key]; // 強制轉 boolean
  }

  try {
    // 檢查是否已有標籤資料
    const existing = await db.select().from(userTags).where(eq(userTags.user_id, userId)).limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: '使用者標籤資料已存在' });
    }

    // 新增一筆
    await db.insert(userTags).values({
      user_id: userId,
      ...validTags,
    });

    return res.status(201).json({ message: '新增酒吧偏好成功' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// 取得使用者偏好
const getBarTagsFromUser = async (req, res) => {
  const userId = Number(req.params.id);

  try {
    const result = await db
      .select()
      .from(userTags)
      .where(eq(userTags.userId, userId));

    if (result.length === 0) {
      return res.status(404).json({ error: '找不到使用者的標籤' });
    }

    return res.status(200).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 更新使用者的標籤偏好資料
const updateTagsFromUser = async (req, res) => {
  const userId = Number(req.params.id);
  const inputTags = req.body;

  const VALID_TAG_KEYS = ['sport', 'music', 'student', 'bistro', 'drink', 'joy', 'romantic', 'oldschool', 'highlevel', 'easy'];
  const validTags = {};
  for (const key of VALID_TAG_KEYS) {
    validTags[key] = !!inputTags[key];
  }

  try {
    const updated = await db.update(userTags)
      .set(validTags)
      .where(eq(userTags.user_id, userId));

    return res.status(200).json({ message: '更新酒吧偏好成功' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

//推薦
// const recommendToUser = async (req, res) => {
//   const userId = Number(req.params.id);

//   try {
//     // 先從user_tags裡，透過user_id 拿到每類偏好
//     const tagValues = await db
//     .select({
//       sport: userTags.sport,
//       music: userTags.music,
//       student: userTags.student,
//       bistro: userTags.bistro,
//       drink: userTags.drink,
//       joy: userTags.joy,
//       romantic: userTags.romantic,
//       oldschool: userTags.oldschool,
//       highlevel: userTags.highlevel,
//       easy: userTags.easy,
//     })
//     .from(userTags)
//     .where(eq(userTags.user_id, userId))
//     .then(rows => rows[0]);
//     // 記錄在 tagValues
//     console.log()
//     //確保不是空值
//     if (!tagValues) {
//       throw new Error('No tag values found for this user');
//     }

//     // 動態生成 eq 條件陣列
//     const tagConditions = Object.entries(tagValues).map(([key, value]) =>
//       eq(barTags[key], value)
//     );

//     //生成符合的id
//     const matchingBarIds = await db
//       .select({ bar_id: barTags.bar_id })
//       .from(barTags)
//       .where(and(...tagConditions));

//     //用符合的id，找對應的酒吧名稱
//     const barIdList = matchingBarIds.map(item => item.bar_id);
//     const matchingBarName = await db
//       .select({ name: barsTable.name })
//       .from(barsTable)
//       .where(inArray(barsTable.id, barIdList));

//     return res.status(200).json({ message: '推薦酒吧:', data: matchingBarName });
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };

module.exports = { addTagsToUser, getBarTagsFromUser, updateTagsFromUser};