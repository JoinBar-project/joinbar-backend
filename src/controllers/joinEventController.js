const db = require('../config/db');
const { userEventParticipationTable, events } = require('../models/schema');
const { eq } = require('drizzle-orm');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
const tz = 'Asia/Taipei';

// 🚧 待導入金流驗證後，補上付款驗證邏輯
const joinEvent = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user?.id;

  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: '找不到活動' });
    }

    const [existing] = await db
      .select()
      .from(userEventParticipationTable)
      .where(
        eq(userEventParticipationTable.userId, userId),
        eq(userEventParticipationTable.eventId, eventId)
      );

    if (existing) {
      return res.status(400).json({ message: '你已報名過此活動' });
    }

    // 🚧 未來導入金流驗證後請替換
    await db.insert(userEventParticipationTable).values({
      userId,
      eventId,
      joinedAt: dayjs().tz(tz).toDate(),
    });

    res.status(200).json({ message: '報名成功（測試階段，尚未接入金流）' });
  } catch (err) {
    console.error('報名活動時發生錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

module.exports = {
  joinEvent
};
