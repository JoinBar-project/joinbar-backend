const { benefitRedeemsTable, barsTable } = require('../models/schema');
const { subTable } = require('../models/schema');
const { subPlans } = require('../utils/subPlans');
const { eq, and, gt } = require('drizzle-orm');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const dayjs = require('dayjs');

const flake = new FlakeId({ id: 1 });

const createBenefit = async (req, res) => {
  const userId = req.user?.id;
  const subId = req.body?.subId;
  
  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  try {
    const [sub] = await db
      .select()
      .from(subTable)
      .where(
        and(
          eq(subTable.userId, userId),
          eq(subTable.id, subId)
        )
      )
      .limit(1);

    if (!sub) {
      return res.status(404).json({ error: '查無訂閱' });
    }

    const benefit = await db
      .select()
      .from(benefitRedeemsTable)
      .where(eq(benefitRedeemsTable.subId, sub.id));

    if (benefit.length > 0) {
      return res.status(400).json({ error: '此訂閱已經領取過優惠券' });
    }

    const plan = subPlans[sub.subType]; 
    if (!plan) {
      return res.status(404).json({ error: '此訂閱方案無效或不存在' });
    }

    const now = dayjs()
    const startAt = now.toDate();
    const endAt = now.add(plan.duration, 'day').toDate(); 

    // 創建優惠券
    const valuesToInsert = [];

    for (const benefit of plan.benefits) {
      for (let i = 0; i < benefit.counts; i++) {
        const id = intformat(flake.next(), 'dec');
        valuesToInsert.push({
          id,
          userId,
          subId: sub.id,
          benefit: benefit.benefit,
          redeemAt: null,
          startAt,
          endAt,
          status: 1,
          createAt: now.toDate(),
          modifyAt: now.toDate(),
        });
      }
    }

    if (valuesToInsert.length > 0) {
      createdCoupons = await db
        .insert(benefitRedeemsTable)
        .values(valuesToInsert)
    }

    res.status(201).json({
      message: '優惠券創建成功'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getBenefit = async (req, res) => {
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  const GetAllBenefit = await db
  .select()
  .from(benefitRedeemsTable)
  .where(eq(benefitRedeemsTable.userId, userId));

  if( GetAllBenefit.length == 0 ){
    return res.status(404).json({ error: '目前尚未擁有優惠券' });
  }

  try{
    const sortGetAllBenefit = GetAllBenefit
    .sort( (couponA, couponB) => {
      if( couponA.status != couponB.status ){
        return couponA.status - couponB.status;
      }
      return  dayjs(couponA.endAt).isBefore(couponB.endAt) ? -1 : 1;
    })

    .map( benefit => ({
        id: benefit.id,
        userId: benefit.userId,
        benefit: benefit.benefit,
        status: benefit.status,
        startAt: dayjs(benefit.startAt).format('YYYY-MM-DD HH:mm:ss'),
        endAt: dayjs(benefit.endAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    res.status(200).json({ benefits: sortGetAllBenefit });

  }catch(err){
    res.status(500).json({ error: err.message });
  }
}

const updateBenefit = async (req, res) => {
  const userId = req.user?.id;
  const benefitId = req.body?.benefitId;
  const barId = req.body?.barId;
  
  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  try {
    const now = dayjs().toDate();

    const [benefit] = await db
      .select()
      .from(benefitRedeemsTable)
      .where(eq(benefitRedeemsTable.id, benefitId))
      .limit(1);

    if (!benefit) {
      return res.status(404).json({ error: '查無此優惠券' });
    }

    if (benefit.userId != userId) {
      return res.status(403).json({ error: '無權限核銷此優惠券' });
    }

    if (benefit.status != 1) {
      return res.status(400).json({ error: '此優惠券無法使用' });
    }

    if (dayjs(benefit.endAt).isBefore(now)) {
      return res.status(400).json({ error: '此優惠券已過期，無法使用' });
    }
    
    const [bar] = await db
      .select()
      .from(barsTable)
      .where(eq(barsTable.id, barId))
      .limit(1);

    if (bar.length === 0) {
      return res.status(404).json({ error: '查無此酒吧' });
    }

    await db
      .update(benefitRedeemsTable)
      .set({
        status: 2,
        barId,
        redeemAt: now,
        modifyAt: now,
      })
      .where(eq(benefitRedeemsTable.id, benefitId));

    return res.status(200).json(
      { message: '優惠券已成功核銷',
        barName: bar.name
      });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { createBenefit, getBenefit, updateBenefit };