const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { events, eventTags } = require('../models/schema');
const { eq } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

const createEvent = async (req, res) => {
  const id = intformat(flake.next(), 'dec');
  const now = new Date();
  const newEvent = {
    id,
    name: req.body.name,
    barName: req.body.barName,
    location: req.body.location,
    startDate: new Date(req.body.startDate),
    endDate: new Date(req.body.endDate),
    maxPeople: req.body.maxPeople,
    imageUrl: req.body.imageUrl,
    price: req.body.price,
    hostUser: req.body.hostUser,
    createdAt: now,
    modifyAt: now,
  };
  
  try {
    //新增活動
    await db.insert(events).values(newEvent);

    //新增活動標籤
    if( req.body.tags && req.body.tags.length > 0){
      const tagsList = []

      for (const tagId of req.body.tags) {
        const tag = {
          eventId: id,
          tagId: tagId
        }
        tagsList.push(tag)
      }

      await db.insert(eventTags).values(tagsList)
    }
    
    res.status(201).json({ message: '活動已建立', event: newEvent });
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

    // 撈取活動標籤
    const eventTag  = await db
    .select({ tagId: eventTags.tagId })
    .from(eventTags)
    .where(eq(eventTags.eventId, eventId));

    const tagIds = eventTag.map(item => Number(item.tagId));
    const stringModel = stringifyBigInts(event)

    res.status(200).json({stringModel, tagIds});
  }catch(err){
    console.log(err)
    
    return res.status(500).json({ message: '伺服器錯誤' });
  }
}

function stringifyBigInts(obj) {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
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
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      maxPeople: req.body.maxPeople,
      imageUrl: req.body.imageUrl,
      price: req.body.price,
      hostUser: req.body.hostUser,
      modifyAt: new Date()
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
    .set({ status : 2, modifyAt: new Date() })
    .where(eq(events.id, eventId));
    return res.status(200).json({ message: '活動已刪除'})

  }catch(err){
    console.log(`無法刪除: ${err}`)
    return res.status(500).json({ message: '伺服器錯誤'})
  }
}

const getAllEvents = async (req, res) => {
  try {
    const eventsList = await db.select().from(events);

    const result = await Promise.all(eventsList.map(async (event) => {
      const eventTag = await db
        .select({ tagId: eventTags.tagId })
        .from(eventTags)
        .where(eq(eventTags.eventId, event.id));
      const tagIds = eventTag.map(item => Number(item.tagId));
      return {
        ...stringifyBigInts(event),
        tagIds
      }
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error('取得全部活動失敗:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
}

module.exports = { createEvent, getEvent, updateEvent, softDeleteEvent, getAllEvents };