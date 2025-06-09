const db = require('../config/db');
// tags, barTags：從 schema 匯入的兩張資料表。barTags 是多對多關聯表（bar 和 tag 的對應關係）
const { userTags } = require('../models/schema');
const { eq } = require('drizzle-orm');

// 新增標籤到個人推薦
const addTagsToUser = async (req, res) => {

  const user_id = Number(req.params.id);
  const {sport, music, student, bistro, drink, joy, romantic, oldschool, highlevel, easy} = req.body;

  try {
    const newUserTags = await db.insert(userTags).values({
      user_id,  
      sport,
      music,
      student,
      bistro,
      drink,
      joy,
      romantic,
      oldschool,
      highlevel,
      easy,
    });

    return res.status(201).json({ message: '新增酒吧特色標籤成功' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 取得使用者偏好
const getBarTagsFromUser = async (req, res) => {
  const user_id = Number(req.params.id);

  try {
    const result = await db
      .select()
      .from(userTags)
      .where(eq(userTags.user_id, user_id));

    if (result.length === 0) {
      return res.status(404).json({ error: '找不到該使用者的標籤' });
    }

    return res.status(200).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 更新使用者的標籤偏好資料
const UpdateTagFromUser = async (req, res) => {
  const user_id = Number(req.params.id);
  const {sport, music, student, bistro, drink, joy, romantic, oldschool, highlevel, easy} = req.body;
  
  try {
    const updatedTag = await db.update(userTags).set({  
      sport,
      music,
      student,
      bistro,
      drink,
      joy,
      romantic,
      oldschool,
      highlevel,
      easy,
    })
    .where(eq(userTags.user_id, user_id));

    return res.status(200).json({ message: '更新酒吧類型偏好成功', data: updatedTag });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { addTagsToUser, getBarTagsFromUser, UpdateTagFromUser };