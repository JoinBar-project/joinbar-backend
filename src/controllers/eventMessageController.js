const FlakeId = require('flake-idgen');
const db = require('../config/db');
const { messages, usersTable, events } = require('../models/schema');
const { eq, and } = require('drizzle-orm');

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

		if (!event) {
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
      .orderBy(messages.createdAt);

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