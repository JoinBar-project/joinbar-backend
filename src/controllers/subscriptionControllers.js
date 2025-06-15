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

  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

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
    console.error('建立訂閱失敗:', err);
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
      message: '查詢訂閱成功',
      subscription: planArr
    });

  }catch(err){
    return res.status(409).json({ error: '訂閱顯示錯誤' });
  }

}

const getPlan = async (req,res) => {
  const userId = req.user?.id;

  if(!userId){
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  try{
    const [ plan ] = await db
    .select()
    .from(subTable)
    .where(
      and(
        eq(subTable.userId, userId),
        eq(subTable.status, 1)
      )
    )
    .limit(1)

    if(!plan){
      return res.status(404).json({ error: '目前沒有訂閱' });
    }

    return res.status(200).json({
      message: '查詢單筆訂閱成功',
      subscription:{
        ...plan,
        startAt: dayjs(plan.startAt).format('YYYY-MM-DD HH:mm:ss'),
        endAt: dayjs(plan.endAt).format('YYYY-MM-DD HH:mm:ss'),
        createAt: dayjs(plan.createAt).format('YYYY-MM-DD HH:mm:ss'),
        modifyAt: dayjs(plan.modifyAt).format('YYYY-MM-DD HH:mm:ss'),
      } ,
    });

  }catch(err){
    return res.status(500).json({ error: '沒系統錯誤，請稍後再試' });
  }
}

module.exports = { createSubscription, getAllPlans, getPlan };