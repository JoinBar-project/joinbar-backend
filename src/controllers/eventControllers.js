const bucket = require('../config/firebase');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { events, eventTags, tags } = require('../models/schema');
const { eq } = require('drizzle-orm');

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)
const tz = 'Asia/Taipei'

const flake = new FlakeId({ id: 1 });


const createEvent = async (req, res) => {
  // 清理 req.body 中的 Tab 字符
  const cleanBody = {};
  for (const [key, value] of Object.entries(req.body)) {
    const cleanKey = key.replace(/\t/g, '').trim();
    cleanBody[cleanKey] = value;
  }

  const parsedStart = dayjs(cleanBody.startDate);
  const parsedEnd = dayjs(cleanBody.endDate);
  const imageFile = req.file;

  let imageUrl = '';
  let blob;

  if (!parsedStart.isValid()) {
    return res.status(400).json({ message: '開始時間格式錯誤' });
  }

  if (!parsedEnd.isValid()) {
    return res.status(400).json({ message: '結束時間格式錯誤' });
  }

  if (!imageFile) {
    return res.status(400).json({ message: '請上傳圖片檔案' });
  }

  if (!cleanBody.name) {
    return res.status(400).json({ message: 'name 欄位是必填的' });
  }

  if (!cleanBody.barName) {
    return res.status(400).json({ message: 'barName 欄位是必填的' });
  }

  try {
    blob = bucket.file(`events/${Date.now()}-${imageFile.originalname}`);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: imageFile.mimetype },
    });

    await new Promise((resolve, reject) => {
      blobStream.on('error', reject);
      blobStream.on('finish', resolve);
      blobStream.end(imageFile.buffer);
    });

    await blob.makePublic();
    imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
  } catch (uploadError) {
    console.error('圖片上傳失敗:', uploadError);
    return res.status(500).json({ message: '圖片上傳失敗' });
  }

  if (!imageUrl) {
    return res.status(500).json({ message: '圖片 URL 產生失敗' });
  }

  const id = intformat(flake.next(), 'dec');
 
  const newEvent = {
    id,
    name: cleanBody.name,
    barName: cleanBody.barName,
    location: cleanBody.location,
    startDate: dayjs(cleanBody.startDate).tz(tz).toDate(),
    endDate: dayjs(cleanBody.endDate).tz(tz).toDate(),
    maxPeople: cleanBody.maxPeople,
    imageUrl,
    price: cleanBody.price,
    hostUser: req.user.id,
    createdAt: dayjs().tz(tz).toDate(),
    modifyAt: dayjs().tz(tz).toDate(),
  };
  
  try {
    await db.insert(events).values(newEvent);

    if(cleanBody.tags && cleanBody.tags.length > 0){
      const tagsList = []

      for (const tagId of cleanBody.tags) {
        const tag = {
          eventId: id,
          tagId: tagId
        }
        tagsList.push(tag)
      }

      await db.insert(eventTags).values(tagsList);
    }
    
    res.status(201).json({ 
      message: '活動已建立',
      imagePreview: imageUrl,
      event: newEvent
    });
    
  } catch (err) {
    console.error('建立活動時發生錯誤:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const getEvent = async (req, res) => {

  const eventId = req.params.id
  try{
    const [ event ] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

    if( !event ){
      return res.status(404).json({ message: '找不到活動'})
    }
    
    if( event.status == 1 && event.endDate < dayjs().tz(tz).toDate()){
      event.status = 3
    }
    // 撈取活動標籤
    const getEventTags  = await db
    .select({ 
      id: tags.id,
      name: tags.name,
    })
    .from(eventTags)
    .innerJoin(tags, eq(eventTags.tagId, tags.id))
    .where(eq(eventTags.eventId, eventId));

    res.status(200).json({ event, tags: getEventTags });
  }catch(err){
    console.log(err)
    
    return res.status(500).json({ message: '伺服器錯誤' });
  }
}

const updateEvent = async( req, res) => {
  const eventId = req.params.id

  try{
    const [ event ] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

    if( !event ){
      return res.status(404).json({ message: '找不到活動'})
    }

    const updatedData = {
      name: req.body.name,
      barName: req.body.barName,
      location: req.body.location,
      startDate: dayjs(req.body.startDate).tz(tz).toDate(),
      endDate: dayjs(req.body.endDate).tz(tz).toDate(),
      maxPeople: req.body.maxPeople,
      imageUrl: req.body.imageUrl,
      price: req.body.price,
      hostUser: req.body.hostUser,
      modifyAt: dayjs().tz(tz).toDate()
    };
    
    await db
    .update(events)
    .set(updatedData)
    .where((eq(events.id, eventId)));

    //活動標籤全刪再新增
    if( req.body.tags && req.body.tags.length > 0){

      await db
      .delete(eventTags)
      .where(eq(eventTags.eventId, eventId));

      const tagsList = []

      for (const tagId of req.body.tags) {
        const tag = {
          eventId: eventId,
          tagId: tagId
        }
        tagsList.push(tag)
      }

      await db.insert(eventTags).values(tagsList)
    }

    res.status(200).json({
      message: '活動已更新',
      update: updatedData
    });
  }catch(err){
    console.log(`更新活動發生錯誤: ${err}`)
    return res.status(500).json({ message: '伺服器錯誤'})
  }
}

const softDeleteEvent  = async( req, res) => {
  const eventId = req.params.id

  try{
    const [ event ] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

    if( !event || event.status == 2 ){
      return res.status(404).json({ message: '找不到活動或已刪除' })
    };

    await db.update(events)
    .set({ 
      status : 2, 
      modifyAt: dayjs().tz(tz).toDate() 
    })
    .where(eq(events.id, eventId));
    return res.status(200).json({ message: '活動已刪除'})

  }catch(err){
    console.log(`無法刪除: ${err}`)
    return res.status(500).json({ message: '伺服器錯誤'})
  }
}

const getAllEvents = async (req, res) => {
  try {
    const rows = await db
      .select({
        eventId: events.id,
        eventData: events,
        tagId: eventTags.tagId
      })
      .from(events)
      .leftJoin(eventTags, eq(events.id, eventTags.eventId));

    const eventMap = new Map();

    for (const row of rows) {
      const id = row.eventId.toString();
      if (!eventMap.has(id)) {
        eventMap.set(id, {
          ...row.eventData,
          tagIds: []
        });
      }
      if (row.tagId) {
        eventMap.get(id).tagIds.push(Number(row.tagId));
      }
    }

    const result = Array.from(eventMap.values());
    res.status(200).json(result);
  } catch (err) {
    console.error('取得全部活動失敗:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

module.exports = { createEvent, getEvent, updateEvent, softDeleteEvent, getAllEvents };