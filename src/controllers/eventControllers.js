// eventControllers.js
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { events, eventTags, tags } = require('../models/schema');
const { eq } = require('drizzle-orm');
const { dayjs, tz } = require('../utils/dateFormatter');
const { uploadImage, deleteImageByUrl } = require('../utils/firebaseUtils');

const flake = new FlakeId({ id: 1 });

const createEvent = async (req, res) => {
  const cleanBody = {};
  for (const [key, value] of Object.entries(req.body)) {
    cleanBody[key.replace(/\t/g, '').trim()] = value;
  }

  const parsedStart = dayjs(cleanBody.startAt);
  const parsedEnd = dayjs(cleanBody.endAt);
  const imageFile = req.file;

  if (!parsedStart.isValid() || !parsedEnd.isValid()) {
    return res.status(400).json({ message: '開始或結束時間格式錯誤' });
  }

  if (!cleanBody.name || !cleanBody.barName) {
    return res.status(400).json({ message: 'name 與 barName 為必填欄位' });
  }

  if (!imageFile) {
    return res.status(400).json({ message: '請上傳圖片檔案' });
  }

  const userRole = req.user.role;
  if (userRole === 'user' && Number(cleanBody.price) > 0) {
    return res.status(403).json({ message: '一般用戶無法建立付費活動' });
  }

  let imageUrl = '';
  try {
    imageUrl = await uploadImage(imageFile.buffer, imageFile.mimetype, imageFile.originalname);
  } catch (uploadErr) {
    console.error('圖片上傳失敗:', uploadErr);
    return res.status(500).json({ message: '圖片上傳失敗' });
  }

  const id = intformat(flake.next(), 'dec');

  const newEvent = {
    id,
    name: cleanBody.name,
    barName: cleanBody.barName,
    location: cleanBody.location,
    startAt: parsedStart.tz(tz).toDate(),
    endAt: parsedEnd.tz(tz).toDate(),
    maxPeople: cleanBody.maxPeople,
    imageUrl,
    price: cleanBody.price,
    hostUser: req.user.id,
    createAt: dayjs().tz(tz).toDate(),
    modifyAt: dayjs().tz(tz).toDate(),
  };

  try {
    const [createdEvent] = await db.insert(events).values(newEvent).returning();

    if (cleanBody.tags && cleanBody.tags.length > 0) {
      const tagsList = cleanBody.tags.map(tagId => ({
        eventId: id,
        tagId,
      }));
      await db.insert(eventTags).values(tagsList);
    }

    res.status(201).json({ message: '活動已建立', event: createdEvent, imagePreview: imageUrl });
  } catch (err) {
    console.error('建立活動錯誤:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const getEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ message: '找不到活動' });

    if (event.status === 1 && event.endAt < dayjs().tz(tz).toDate()) {
      event.status = 3;
    }

    const getEventTags = await db
      .select({ id: tags.id, name: tags.name })
      .from(eventTags)
      .innerJoin(tags, eq(eventTags.tagId, tags.id))
      .where(eq(eventTags.eventId, eventId));

    res.status(200).json({ event, tags: getEventTags });
  } catch (err) {
    console.error('getEvent 錯誤:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const updateEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ message: '找不到活動' });

    if (event.hostUser !== req.user.id) {
      return res.status(403).json({ message: '你沒有權限修改此活動' });
    }

    const imageFile = req.file;
    let imageUrl = event.imageUrl;

    if (imageFile) {
      await deleteImageByUrl(imageUrl);
      imageUrl = await uploadImage(imageFile.buffer, imageFile.mimetype, imageFile.originalname);
    }

    const updatedData = {
      name: req.body.name,
      barName: req.body.barName,
      location: req.body.location,
      startAt: dayjs(req.body.startAt).tz(tz).toDate(),
      endAt: dayjs(req.body.endAt).tz(tz).toDate(),
      maxPeople: req.body.maxPeople,
      imageUrl,
      price: req.body.price,
      hostUser: req.user.id,
      modifyAt: dayjs().tz(tz).toDate(),
    };

    await db
    .update(events)
    .set(updatedData)
    .where(eq(events.id, eventId));

    //活動標籤全刪再新增
    if (req.body.tags && req.body.tags.length > 0) {
      
      await db
      .delete(eventTags)
      .where(eq(eventTags.eventId, eventId));
      
      const tagsList = req.body.tags.map(tagId => ({
        eventId,
        tagId
      }));

      await db.insert(eventTags).values(tagsList);
    }

    const updatedTags = await db
      .select({
        id: tags.id,
        name: tags.name
      })
      .from(eventTags)
      .innerJoin(tags, eq(eventTags.tagId, tags.id))
      .where(eq(eventTags.eventId, eventId));

    return res.status(200).json({
      message: '活動已更新',
      update: { ...updatedData, id: eventId, tags: updatedTags },
    });
  } catch (err) {
    console.error(`更新活動發生錯誤:`, err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const softDeleteEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event || event.status === 2) {
      return res.status(404).json({ message: '找不到活動或已刪除' });
    }

    if (event.hostUser !== req.user.id) {
      return res.status(403).json({ message: '你沒有權限刪除此活動' });
    }

    if (event.imageUrl) {
      await deleteImageByUrl(event.imageUrl);
    }

    await db.update(events)
      .set({ status: 2, modifyAt: dayjs().tz(tz).toDate() })
      .where(eq(events.id, eventId));

    return res.status(200).json({ message: '活動已刪除' });
  } catch (err) {
    console.error('刪除活動錯誤:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const rows = await db
      .select({ eventId: events.id, eventData: events, tagId: eventTags.tagId })
      .from(events)
      .leftJoin(eventTags, eq(events.id, eventTags.eventId));

    const eventMap = new Map();

    for (const row of rows) {
      const id = row.eventId.toString();
      if (!eventMap.has(id)) {
        eventMap.set(id, { ...row.eventData, tagIds: [] });
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