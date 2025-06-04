const db = require('../config/db');
// tags, barTags：從 schema 匯入的兩張資料表。barTags 是多對多關聯表（bar 和 tag 的對應關係）
const { tags, eventTags } = require('../models/schema');
const { eq } = require('drizzle-orm');

// 新增標籤到酒吧
const addTagsToBar = async (req, res) => {
  // 轉成 10 進位整數
  const barId = parseInt(req.params.barId, 10);
  const tagId = req.body.tagId;

  if (!Array.isArray(tagId) || tagId.length === 0) {
    return res.status(400).json({ message: '請提供 tagIds 陣列'});
  }

  try{
    const barTagData = tagId.map((tagId) => ({
      barId,
      tagId
    }));

    await db.insert(barTags).values(barTagData);
    return res.status(201).json({ message: '已新增標籤到酒吧', tags: tagIds });
  } catch (err) {
    console.error('新增標籤失敗：',err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const getBarTags = async (req, res) => {
  
}

const removeTagFromBar = async (req, res) => {
  
}