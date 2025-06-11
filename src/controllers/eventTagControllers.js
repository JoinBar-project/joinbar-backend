const db = require('../config/db');
const { tags, eventTags } = require('../models/schema');
const { eq } = require('drizzle-orm');

const createTag = async (req, res) => {
  const newTag = {
    name: req.body.name
  }

  try {
    await db.insert(tags).values(newTag);
    res.status(201).json({ message: '標籤已建立', tag: newTag });
  } catch (err) {
    console.error('建立標籤時發生錯誤:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const getTag = async (req, res) => {

  const tagId = req.params.id
  try{
    const [ tag ] = await db
    .select()
    .from(tags)
    .where(eq(tags.id, tagId));

    if( !tag ){
      return res.status(404).json({ message: '找不到標籤'})
    }
    return res.status(200).json(tag);
  }catch(err){
    console.log(err)
    
    return res.status(500).json({ message: '伺服器錯誤' });
  }
}

const getListTag = async (req, res) => {

  try{
    const tagsAll = await db
    .select()
    .from(tags);

    return res.status(200).json(tagsAll);
  }catch(err){
    console.log(err)
    
    return res.status(500).json({ message: '伺服器錯誤' });
  }
}

const deleteTag  = async( req, res) => {
  const tagId = req.params.id

  try{
    const [ tag ] = await db
    .select()
    .from(tags)
    .where(eq(tags.id, tagId));

    if( !tag ){
      return res.status(404).json({ message: '找不到標籤' });
    };

    //刪除標籤
    await db
    .delete(tags)
    .where(eq(tags.id, tagId));

    //刪除活動標籤
    await db
    .delete(eventTags)
    .where(eq(eventTags.tagId, tagId));

    return res.status(200).json({ message: '標籤已刪除' });

  }catch(err){
    console.log(`無法刪除: ${err}`)
    return res.status(500).json({ message: '伺服器錯誤'})
  }
}

module.exports = { createTag, getTag, getListTag, deleteTag };