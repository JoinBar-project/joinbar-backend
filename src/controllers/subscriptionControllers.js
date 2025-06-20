const { subTable } = require('../models/schema');
const { subPlans } = require('../utils/subPlans');
const { eq, and, gt } = require('drizzle-orm');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { dayjs, tz } = require('../utils/dateFormatter');

const flake = new FlakeId({ id: 1 });

const createSubscription = async (req, res) => {

  const userId = req.user?.id;
  const { subType } = req.body;

  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  try {
    const plan = subPlans[subType];
    if (!plan) {
      return res.status(400).json({ error: '不支援的訂閱方案' });
    }

    const now = dayjs().tz(tz);
    const startAt = now.toDate();
    const endAt = now.add(plan.duration, 'day').toDate();
    const id = intformat(flake.next(), 'dec');

    const existingSubs = await db
      .select()
      .from(subTable)
      .where(
        and(
          eq(subTable.userId, userId),
          eq(subTable.subType, subType),
          eq(subTable.status, 1),
          gt(subTable.endAt, now.toDate()) // 已過期

        )
      )
      .execute();

    if (existingSubs.length > 0) {
      return res.status(409).json({ error: '已有相同類型的訂閱，請改訂閱其他方案' });
    }

    const [newSub] = await db.insert(subTable).values({
      id,
      userId,
      subType,
      price: plan.price,
      startAt,
      endAt,
      status: 1,
      createAt: now.toDate(),
      modifyAt: now.toDate(),
    }).returning();

    return res.status(201).json({
      message: '訂閱成功',
      subscription: newSub
    });

  } catch (err) {
    return res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
};

const getAllPlans = async (req, res) =>{

  try{
    const planArr = Object.entries(subPlans).map(([key, value]) => ({
      type: key,
      ...value
      })
    );

    return res.status(200).json({
      message: '查詢訂閱方案完成',
      subscription: planArr
    });

  }catch(err){
    return res.status(409).json({ error: '訂閱顯示錯誤' });
  }
}

const getPlan = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  try {
    const now = dayjs();

    const plans = await db
      .select()
      .from(subTable)
      .where(
        and(
          eq(subTable.userId, userId),
          eq(subTable.status, 1),
          gt(subTable.endAt, now) // 尚未過期
        )
      );

    if (plans.length === 0) {
      return res.status(404).json({ error: '目前沒有有效訂閱' });
    }

    const formattedPlans = plans.map(plan => ({
      ...plan,
      startAt: dayjs(plan.startAt).format('YYYY-MM-DD HH:mm:ss'),
      endAt: dayjs(plan.endAt).format('YYYY-MM-DD HH:mm:ss'),
      createAt: dayjs(plan.createAt).format('YYYY-MM-DD HH:mm:ss'),
      modifyAt: dayjs(plan.modifyAt).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return res.status(200).json({
      message: '查詢成功',
      subscriptions: plans
    });

  } catch (err) {
    console.error('查詢訂閱失敗:', err);
    return res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
};
module.exports = { createSubscription, getAllPlans, getPlan };