const { benefitRedeemsTable } = require('../models/schema');
const { subPlans } = require('../utils/subPlans');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { dayjs, tz } = require('../utils/dateFormatter');
const { orderItems } = require('../models/schema');
const { eq } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

const createBenefit = async (userId, orderId) => {
  try {
    const orderItemsList = await db
      .select(orderItems)
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    const order = orderItemsList[0]
    const test = subPlans[order.subscriptionType]
    const now = dayjs().tz(tz);
    const startAt = now.toDate();
    const endAt = now.add(test.duration, 'day').toDate();
    // // 建立優惠券
    const valuesToInsert = []
    for (const benefit of test.benefits) {
      for (let i = 0; i < benefit.counts; i++) {
        const id = intformat(flake.next(), 'dec');
        valuesToInsert.push({
          id,
          userId,
          subId: order.subscriptionId,
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
      await db
        .insert(benefitRedeemsTable)
        .values(valuesToInsert);
    }
  } catch (err) {
    console.error(err)
  }
};

module.exports = { createBenefit };
