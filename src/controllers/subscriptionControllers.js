const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { eq } = require('drizzle-orm');
const dayjs = require('dayjs');
const { subTable } = require('../models/schema');
const { subPlans } = require('../utils/subscriptionPlans');

const flake = new FlakeId({ id: 1 });

const createSubscription = async (req, res) => {
  const userId = req.user.id;
  const { subType } = req.body;

  if (!subPlans[subType]) {
    return res.status(400).json({ error: '不支援的訂閱方案' });
  }

  try {
    const id = intformat(flake.next(), 'dec');

    const [existing] = await db
      .select()
      .from(subTable)
      .where(eq(subTable.userId, userId));

    const hasSub = existing.some(sub => sub.status === 1);
    if (hasSub) {
      return res.status(409).json({ error: '已有訂閱，請先取消現有方案' });
    }

    const now = dayjs();
    const startAt = now.toDate();
    const endAt = now.add(subPlans[subType].duration, 'day').toDate();

    const price = subPlans[subType].price;

    const [newSub] = await db.insert(subTable).values({
      id,
      userId,
      subType,
      price,
      startAt,
      endAt,
      status: 1, //1: 已訂閱，2: 取消，3: 到期
      createdAt: now.toDate(),
      modifyAt: now.toDate(),
    }).returning();

    return res.status(201).json({
      message: '訂閱成功',
      subscription: newSub
    });
  } catch (err) {
    console.error('建立訂閱失敗:', err);
    return res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
};

module.exports = { createSubscription };