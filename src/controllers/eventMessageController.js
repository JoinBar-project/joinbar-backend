const db = require('../config/db');
const { messages, usersTable } = require('../models/schema');
const { eq, desc } = require('drizzle-orm');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
const tz = 'Asia/Taipei';


const getMessagesByEventId = async (req, res) => {
  const eventId = req.params.id;

  try {
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
      .orderBy(messages.createdAt);

    res.status(200).json({ message: '留言取得成功', messages: result });
  } catch (err) {
    console.error('取得留言時發生錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};


const postMessageToEvent = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user?.id;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: '留言內容不可為空' });
  }
  if (content.trim().length > 200) {
    return res.status(400).json({ message: '留言長度不得超過 200 字' });
  }

  try {
    const lastMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (lastMessage.length > 0) {
      const diffInSeconds = (Date.now() - new Date(lastMessage[0].createdAt)) / 1000;
      if (diffInSeconds < 10) {
        return res.status(429).json({ message: '請勿頻繁留言，請稍後再試。' });
      }
    }

    if (lastMessage.length > 0 && lastMessage[0].content === content.trim()) {
      return res.status(400).json({ message: '請勿重複留言相同內容' });
    }

    await db.insert(messages).values({
      content: content.trim(),
      userId,
      eventId,
      createdAt: dayjs().tz(tz).toDate()
    });

    res.status(201).json({ message: '留言已新增' });
  } catch (err) {
    console.error('新增留言錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

const updateMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: '留言內容不可為空' });
  }

  try {
    await db.update(messages)
      .set({ content: content.trim() })
      .where(eq(messages.id, messageId));

    res.status(200).json({ message: '留言已更新' });
  } catch (err) {
    console.error('更新留言錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    await db.delete(messages)
      .where(eq(messages.id, messageId));

    res.status(200).json({ message: '留言已刪除' });
  } catch (err) {
    console.error('刪除留言錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

module.exports = {
  getMessagesByEventId,
  postMessageToEvent,
  updateMessage,
  deleteMessage
};
