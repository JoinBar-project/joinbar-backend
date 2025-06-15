const { subTable } = require('../models/schema');
const { subPlans } = require('../utils/subPlans');
const { eq } = require('drizzle-orm');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const dayjs = require('dayjs');

const flake = new FlakeId({ id: 1 });

const createSubscription = async (req, res) => {
  console.log('🔥 createSubscription 被呼叫');
  
  const userId = req.user?.id;
  const { subType } = req.body;

  console.log('🧑 使用者 ID:', userId);
  console.log('📦 req.body:', req.body);

  // 判斷 userId 是否存在
  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  // 檢查訂閱方案是否存在
  const plan = subPlans[subType];
  if (!plan) {
    return res.status(400).json({ error: '不支援的訂閱方案' });
  }

  try {
    const id = intformat(flake.next(), 'dec');

    const existingSubs = await db
      .select()
      .from(subTable)
      .where(eq(subTable.userId, userId))
      .execute();

    console.log('💡 existingSubs:', existingSubs);

    const hasActiveSub = existingSubs?.some(sub => sub.status === 1);
    if (hasActiveSub) {
      return res.status(409).json({ error: '已有訂閱，請先取消現有方案' });
    }

    const now = dayjs();
    const startAt = now.toDate();
    const endAt = now.add(plan.duration, 'day').toDate();

    const [newSub] = await db.insert(subTable).values({
      id,
      userId,
      subType,
      price: plan.price,
      startAt,
      endAt,
      status: 1, // 1: 已訂閱，2: 取消，3: 到期
      createAt: now.toDate(),
      modifyAt: now.toDate(),
    }).returning();

    return res.status(201).json({
      message: '訂閱成功',
      subscription: {
        ...newSub,
        startAt: dayjs(newSub.startAt).format('YYYY-MM-DD HH:mm:ss'),
        endAt: dayjs(newSub.endAt).format('YYYY-MM-DD HH:mm:ss'),
        createAt: dayjs(newSub.createAt).format('YYYY-MM-DD HH:mm:ss'),
        modifyAt: dayjs(newSub.modifyAt).format('YYYY-MM-DD HH:mm:ss'),
      }
    });

  } catch (err) {
    console.error('❌ 建立訂閱失敗:', err);
    return res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
};

module.exports = { createSubscription };