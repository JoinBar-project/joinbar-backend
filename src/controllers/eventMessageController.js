const FlakeId = require('flake-idgen');
const db = require('../config/db');
const { messages, usersTable, events } = require('../models/schema');
const { eq, and, desc } = require('drizzle-orm');
const { dayjs, tz } = require('../utils/dateFormatter');
const intformat = require('biguint-format');

const flake = new FlakeId({ id: 1 });

const getMessagesByEventId = async (req, res) => {
	const eventId = req.params.id;

	try {
		const [event] = await db
      .select()
      .from(events)
      .where(and(
        eq(events.id, eventId),
        eq(events.status, 1)
      ))
      .limit(1);

		if(!event) {
      return res.status(404).json({ message: '活動不存在或已刪除' });
    }

		// 取得該活動的所有留言
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        userId: messages.userId,
        userNickname: usersTable.nickname,
        userAvatarUrl: usersTable.avatarUrl
      })
      .from(messages)
      .leftJoin(usersTable, eq(messages.userId, usersTable.id))
      .where(eq(messages.eventId, eventId))
      .orderBy(desc(messages.createdAt));

    res.status(200).json({ 
      message: '留言取得成功', 
      messages: result,
      eventInfo: {
        id: event.id,
        name: event.name,
        status: event.status
      }
    });
	} catch(err) {
		console.error('取得留言時發生錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
	}
};

const postMessageToEvent = async(req, res) => {
  const { content } = req.body;
  const eventId = req.params.id;
  const userId = req.user?.id;

  if(!content || content.trim() === '') {
    return res.status(400).json({ message: '留言內容不可為空' });
  }

  if(content.trim().length > 200) {
    return res.status(400).json({ message: '留言長度不得超過 200 字' });
  }

  try{
    // 驗證活動是否存在或有效
    const [event] = await db
      .select()
      .from(events)
      .where(and(
        eq(events.id, eventId),
        eq(events.status, 1)  // 確保活動未被刪除
      ))
      .limit(1);

    if(!event) {
      return res.status(404).json({ message: '活動不存在或已刪除' });
    }

    const now = dayjs().tz(tz).toDate();
    if(event.endAt < now) {
      return res.status(400).json({ message: '活動已結束 無法留言' });
    }

    // 檢查最後一則留言時間和是否相同留言
    const [lastMessage] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.userId, userId),
          eq(messages.eventId, eventId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (lastMessage) {
      const diffInSeconds = (Date.now() - new Date(lastMessage.createdAt)) / 1000;
      if (diffInSeconds < 10) {
        return res.status(429).json({ message: '請勿頻繁留言 請稍後再試' });
      }

      if (lastMessage.content === content.trim()) {
        return res.status(400).json({ message: '請勿重複留言相同內容' });
      }
    }

    // 雪花產ID
    const messageId = intformat(flake.next(), 'dec');

    await db.insert(messages).values({
      id: messageId,
      content: content.trim(),
      userId,
      eventId,
      createdAt: dayjs().tz(tz).toDate()
    });

    res.status(201).json({ 
      message: '留言已新增',
      eventInfo: {
        id: event.id,
        name: event.name
      }
    });
  } catch(err) {
    console.error('新增留言錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

module.exports = {
  getMessagesByEventId,
  postMessageToEvent
};