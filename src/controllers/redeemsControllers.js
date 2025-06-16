const { benefitRedeemsTable } = require('../models/schema');
const { subTable } = require('../models/schema');
const { subPlans } = require('../utils/subPlans');
const { eq, and, gt, lt } = require('drizzle-orm');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const dayjs = require('dayjs');

const flake = new FlakeId({ id: 1 });

const createbenefit = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: '未授權，請先登入' });
  }

  const now = dayjs();
  const startAt = now.toDate();
  const endAt = now.add(plan.duration, 'day').toDate();
  const id = intformat(flake.next(), 'dec');

  const subscriptions = await db
    .select()
    .from(subTable)
    .leftJoin(benefitRedeems, eq(subTable.id, benefitRedeems.subId))
    .where(
      and(
        eq(subTable.userId, userId),
        eq(subTable.status, 1),  
        gt(subTable.endAt, now)  // 尚未過期
      )
    )
    .limit(3);  

  if (subscriptions.length == 0) {
    return res.status(404).json({ error: '該用戶沒有有效訂閱' });
  }

  try {
    // 有效訂閱的優惠內容
    for (const sub of subscriptions) {
      const subType = sub.subType; 
      const benefits = subPlans[subType]?.benefits; 

      if (!benefits) {
        return res.status(404).json({ error: '此訂閱方案無優惠內容' });
      }

      const createBenefitPromises = benefits.map(async (benefit) => {
        // 插入優惠券資料到資料庫
        const newBenefit = await db.insert(benefitRedeemsTable)
        .values({
          id,
          userId,
          subId: sub.id,
          benefit,
          redeemAt: null, // 尚未核銷，設為 null
          startAt,
          endAt,
          status: 1,
          createAt: now.toDate(),
          modifyAt: now.toDate(),
        })
        .returning();

        // 收集建立的優惠券資料
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

module.exports = { createbenefit };