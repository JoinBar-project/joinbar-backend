const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { events, eventTags, tags } = require('../models/schema');
const { eq } = require('drizzle-orm');
const { dayjs, tz } = require('../utils/dateFormatter');

const flake = new FlakeId({ id: 1 });

const createEvent = async (req, res) => {

  const parsedStart = dayjs(req.body.startAt);
  const parsedEnd = dayjs(req.body.endAt);

  if (!parsedStart.isValid()) {
    return res.status(400).json({ message: '開始時間格式錯誤' });
  }

  if (!parsedEnd.isValid()) {
    return res.status(400).json({ message: '結束時間格式錯誤' });
  }

  const id = intformat(flake.next(), 'dec');
 
  const newEvent = {
    id,
    name: req.body.name,
    barName: req.body.barName,
    location: req.body.location,
    startAt: dayjs(req.body.startAt).tz(tz).toDate(),
    endAt: dayjs(req.body.endAt).tz(tz).toDate(),
    maxPeople: req.body.maxPeople,
    imageUrl: req.body.imageUrl,
    price: req.body.price,
    hostUser: req.body.hostUser,
    createAt: dayjs().tz(tz).toDate(),
    modifyAt: dayjs().tz(tz).toDate(),
  };
  
  try {
    //新增活動
    const [ createdEvent ] = await db.insert(events).values(newEvent).returning();

    console.log('🧪 createdEvent:', createdEvent);
    console.log('🧪 typeof createdEvent.startAt:', typeof createdEvent.startAt);
    console.log('🧪 typeof createdEvent.start_at:', typeof createdEvent.start_at);

    //新增活動標籤
    if( req.body.tags && req.body.tags.length > 0){
      const tagsList = req.body.tags.map(tagId => ({
        eventId: id,
        tagId: tagId
      })); 

      try{
        await db.insert(eventTags).values(tagsList)
      }catch(tagErr){
        console.error("新增標籤失敗，可能是外鍵錯誤：", tagErr.message);
        return res.status(400).json({ message: '活動新增成功，但標籤失敗，請確認 tag 是否存在', error: tagErr.message });
      }
    }
    res.status(201).json({ message: '活動已建立', event: createdEvent  });
      
    }catch (err) {
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
    
    if( event.status == 1 && event.endAt < dayjs().tz(tz).toDate()){
      event.status = 3
    }

    // event.startAt = dayjs(event.startAt).tz(tz).tz(tz).toDate(); 
    // event.endAt = dayjs(event.endAt).tz(tz).tz(tz).toDate();
    // event.createAt = dayjs(event.createAt).tz(tz).tz(tz).toDate();
    // event.modifyAt = dayjs(event.modifyAt).tz(tz).tz(tz).toDate();

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
      startAt: dayjs(req.body.startAt).tz(tz).toDate(),
      endAt: dayjs(req.body.endAt).tz(tz).toDate(),
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

      const tagsList = req.body.tags.map(tagId =>({
        eventId,
        tagId
      }))

      await db.insert(eventTags).values(tagsList)
    }

    const updatedTags = await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(eventTags)
      .innerJoin(tags, eq(eventTags.tagId, tags.id))
      .where(eq(eventTags.eventId, eventId));

    return res.status(200).json({
      message: '活動已更新',
      update: {
        ...updatedData,
        id: eventId,
        tags: updatedTags,
      },
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