const { benefitRedeemsTable } = require('../models/schema');
const { subTable } = require('../models/schema');
const { subPlans } = require('../utils/subPlans');
const { eq, and, gt, lt } = require('drizzle-orm');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const dayjs = require('dayjs');

const flake = new FlakeId({ id: 1 });

const createBenefit = async (req, res) => {
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  const now = dayjs();
  const createdCoupons = [];

  const subscriptions = await db
    .select()
    .from(subTable)
    .leftJoin(benefitRedeemsTable, eq(subTable.id, benefitRedeemsTable.subId))
    .where(
      and(
        eq(subTable.userId, userId),
        eq(subTable.status, 1),
        eq(benefitRedeemsTable.status, 0), // 尚未生成優惠券
        gt(subTable.endAt, now)  // 尚未過期
      )
    )
    .limit(3);

  if (subscriptions.length == 0) {
    return res.status(404).json({ error: '查無訂閱 或 所有訂閱已經領取過優惠券' });
  }

  try {

    for (const subscription of subscriptions) {
      const sub = subscription.subs;
      const subType = sub.subType;
      
      const plan = subPlans[subType];

      if (!plan) {
        return res.status(404).json({ error: '此訂閱方案無效或不存在' });
      }

      const benefits = plan?.benefits;

      if (!benefits) {
        return res.status(404).json({ error: '此訂閱方案無優惠內容' });
      }

      const startAt = now.toDate();
      const endAt = now.add(plan.duration, 'day').toDate();

      const createBenefitPromises = benefits.map(async (benefit) => {
        const id = intformat(flake.next(), 'dec');
        const newBenefit = await db.insert(benefitRedeemsTable)
          .values({
            id,
            userId,
            subId: sub.id,
            benefit,
            redeemAt: null, // 尚未核銷
            startAt,
            endAt,
            status: 1, // 優惠券狀態為有效
            createAt: now.toDate(),
            modifyAt: now.toDate(),
          })
          .returning();

        createdCoupons.push(newBenefit[0]);
      });

      await Promise.all(createBenefitPromises);
    }

    res.status(201).json({
      message: '優惠券創建成功',
      coupons: createdCoupons,
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

  console.log(`===========${GetAllBenefit}`)

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
        startAt: benefit.startAt,
        endAt: benefit.endAt
    }));

    res.status(200).json({ benefits: sortGetAllBenefit });

  }catch(err){
    res.status(500).json({ error: err.message });
  }

  
  


}

module.exports = { createBenefit, getBenefit };