const db = require('../config/db');
// tags, barTags：從 schema 匯入的兩張資料表。barTags 是多對多關聯表（bar 和 tag 的對應關係）
const { userTags } = require('../models/schema');
const { eq } = require('drizzle-orm');

// 新增標籤到個人推薦
const addTagsToUser = async (req, res) => {
  const {UserId ,sport, music, student, bistro, drink, joy, romantic, oldschool, highlevel, easy} = req.body;

  console.log('user_id:', UserId); 

  try {
    const newUserTags = await db.insert(userTags).values({
      UserId,  
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

    return res.status(201).json({ message: "新增成功"});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// const getBarTags = async (req, res) => {
  
// }

// const removeTagFromBar = async (req, res) => {
  
// }

module.exports = { addTagsToUser };