const db = require('../config/db');
const { orders, orderItems, userEventParticipationTable, subTable } = require('../models/schema');
const { eq, and, inArray } = require('drizzle-orm');
const LinePayProvider = require('../utils/linePayProvider');
const dayjs = require('dayjs');

const handleError = (err, res) => {
 console.error('LINE Pay 錯誤:', err);
 
 const errorResponse = {
   error: true,
   timestamp: dayjs().toISOString(),
   message: '',
   code: ''
 }

 if (err.message.includes('找不到')) {
   errorResponse.message = err.message;
   errorResponse.code = 'NOT_FOUND';
   return res.status(404).json(errorResponse);
 }
 
 if (err.message.includes('無權限')) {
   errorResponse.message = err.message;
   errorResponse.code = 'FORBIDDEN';
   return res.status(403).json(errorResponse);
 }
 
 if (err.message.includes('已付款') || err.message.includes('狀態')) {
   errorResponse.message = err.message;
   errorResponse.code = 'INVALID_STATE';
   return res.status(400).json(errorResponse);
 }
 
 errorResponse.message = '付款處理失敗，請稍後再試';
 errorResponse.code = 'PAYMENT_ERROR';
 return res.status(500).json(errorResponse);
};

const createLinePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;
    
    console.log('🔄 創建 LINE Pay，訂單 ID:', String(orderId)); 
    
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, String(orderId)), 
        eq(orders.userId, userId),
        eq(orders.status, 'pending')
      ));
    
    if (!order) {
      return res.status(404).json({
        error: '找不到待付款訂單',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.paymentId && order.paymentMethod === 'linepay') {
      const statusCheck = await LinePayProvider.checkPaymentStatus(order.paymentId);
      if (statusCheck.success && !statusCheck.isPaid) {
        return res.json({
          success: true,
          message: '使用現有付款交易',
          data: {
            orderId: order.id,
            transactionId: order.paymentId,
            message: '請完成您的 LINE Pay 付款'
          }
        });
      }
    }

    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    const isAllSubscription = orderItemsList.every(item => item.itemType === 2);
    const isAllEvent = orderItemsList.every(item => item.itemType === 1);
    
    // ✅ 統一使用後端回調，根據訂單類型在後端決定跳轉
    let returnUrl = `${backendUrl}/api/linepay/confirm?orderId=${order.id}`;
    const cancelUrl = `${frontendUrl}/payment/cancel?orderId=${String(order.id)}`;
    
    let description, packageName, products;
    
    if (isAllSubscription) {
      description = `訂閱方案 - ${orderItemsList.length} 項`;
      packageName = '訂閱服務';
      products = orderItemsList.map((item, index) => ({
        id: `product_${String(item.id)}`,   
        name: item.subscriptionType ? `訂閱：${item.subscriptionType}` : `訂閱方案 ${index + 1}`,
        quantity: Number(item.quantity),     
        price: Number(item.price)           
      }));
    } else {
      description = `活動訂票 - ${orderItemsList.length} 個活動`;
      packageName = '活動票券';
      products = orderItemsList.map((item, index) => ({
        id: `product_${String(item.id)}`, 
        name: item.eventName ? `${item.eventName} - ${item.barName || ''}` : `活動 ${index + 1}`,
        quantity: Number(item.quantity),   
        price: Number(item.price)           
      }));
    }

    const paymentData = {
      orderId: String(order.id),
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      currency: 'TWD',
      description: description,
      returnUrl: returnUrl,  // ✅ 統一使用後端回調
      cancelUrl: cancelUrl,
      packages: [{
        id: `package_${String(order.id)}`,
        amount: Number(order.totalAmount),
        name: packageName,
        products: products
      }]
    };

    console.log('🔍 paymentData:', JSON.stringify(paymentData, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2
    ));

    const paymentResult = await LinePayProvider.createPayment(paymentData);
    
    if (!paymentResult.success) {
      return res.status(400).json({
        error: 'LINE Pay 付款創建失敗',
        message: paymentResult.message,
        code: paymentResult.code || 'LINEPAY_ERROR'
      });
    }

    await db.update(orders).set({
      paymentMethod: 'linepay',
      paymentId: paymentResult.transactionId,
      updatedAt: dayjs().tz('Asia/Taipei').toDate()
    }).where(eq(orders.id, orderId));

    res.json({
      success: true,
      message: 'LINE Pay 付款創建成功',
      data: {
        orderId: String(order.id),          
        orderNumber: order.orderNumber,
        amount: Number(order.totalAmount),  
        transactionId: paymentResult.transactionId,
        paymentUrl: paymentResult.paymentUrl,
        expireTime: dayjs().add(15, 'minute').toISOString()
      }
    });

  } catch (error) {
    return handleError(error, res);
  }
};

// ✅ 完整修復的確認付款流程
const confirmLinePayment = async (req, res) => {
  try {
    const { transactionId, orderId } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    console.log('🔄 LINE Pay 確認回調:', { transactionId, orderId });

    if (!transactionId || !orderId) {
      console.error('❌ 缺少必要參數:', { transactionId, orderId });
      return res.redirect(`${frontendUrl}/payment/error?message=缺少付款參數`);
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      console.error('❌ 找不到訂單:', orderId);
      return res.redirect(`${frontendUrl}/payment/error?message=找不到訂單`);
    }

    // ✅ 如果已經確認過，直接跳轉到對應的成功頁面
    if (order.status === 'confirmed') {
      console.log('✅ 訂單已確認，直接跳轉:', orderId);
      
      // 檢查訂單類型，決定跳轉位置
      const orderItemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const isAllSubscription = orderItemsList.every(item => item.itemType === 2);
      
      if (isAllSubscription) {
        return res.redirect(`${frontendUrl}/subscription-success?orderId=${orderId}&orderNumber=${order.orderNumber}&transactionId=${transactionId}`);
      } else {
        return res.redirect(`${frontendUrl}/order-success/${order.orderNumber}?orderId=${orderId}&transactionId=${transactionId}`);
      }
    }

    if (order.status !== 'pending') {
      console.log('⚠️ 訂單狀態異常:', order.status);
      return res.redirect(`${frontendUrl}/payment/error?message=訂單狀態異常`);
    }

    // ✅ 確認 LINE Pay 付款
    const confirmResult = await LinePayProvider.confirmPayment(
      transactionId,
      order.totalAmount,
      'TWD'
    );

    if (!confirmResult.success) {
      console.error('❌ LINE Pay 確認失敗:', confirmResult);
      return res.redirect(`${frontendUrl}/payment/error?message=${confirmResult.message}`);
    }

    // ✅ 完整的訂單確認流程（包含活動參與記錄 + 訂閱處理）
    await db.transaction(async (tx) => {
      // 更新訂單狀態
      await tx.update(orders).set({
        status: 'confirmed',
        paidAt: dayjs().tz('Asia/Taipei').toDate(),
        transactionId: confirmResult.transactionId,
        updatedAt: dayjs().tz('Asia/Taipei').toDate()
      }).where(eq(orders.id, orderId));

      // 獲取訂單項目
      const orderItemsList = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      console.log('📋 訂單項目:', orderItemsList);

      // ✅ 處理活動參與記錄
      const eventItems = orderItemsList.filter(item => item.eventId && item.itemType === 1);
      if (eventItems.length > 0) {
        const participationData = eventItems.map(item => ({
          userId: order.userId,
          eventId: item.eventId,
          joinedAt: dayjs().tz('Asia/Taipei').toDate(),
          updatedAt: dayjs().tz('Asia/Taipei').toDate()
        }));

        await tx.insert(userEventParticipationTable).values(participationData);
        console.log(`✅ 已加入 ${participationData.length} 個活動參與記錄`);
      }

      // ✅ 處理訂閱方案
      const subscriptionItems = orderItemsList.filter(item => item.itemType === 2 && item.subscriptionType);
      if (subscriptionItems.length > 0) {
        console.log('📋 處理訂閱項目:', subscriptionItems);
        
        // 導入訂閱方案配置
        const { subPlans } = require('../utils/subPlans');
        const FlakeId = require('flake-idgen');
        const intformat = require('biguint-format');
        const flake = new FlakeId({ id: 1 });

        for (const item of subscriptionItems) {
          const plan = subPlans[item.subscriptionType];
          
          if (plan) {
            const subId = intformat(flake.next(), 'dec');
            const now = dayjs().tz('Asia/Taipei').toDate();
            const startAt = now;
            const endAt = dayjs(now).add(plan.duration, 'day').toDate();

            // 建立訂閱記錄
            await tx.insert(subTable).values({
              id: subId,
              userId: order.userId,
              subType: item.subscriptionType,
              price: item.price,
              startAt,
              endAt,
              status: 1,
              createAt: now,
              modifyAt: now,
            });

            // 更新訂單項目的訂閱 ID
            await tx.update(orderItems)
              .set({ subscriptionId: subId })
              .where(eq(orderItems.id, item.id));

            console.log(`✅ 已建立訂閱: ${item.subscriptionType}, ID: ${subId}`);
          } else {
            console.error(`❌ 找不到訂閱方案: ${item.subscriptionType}`);
          }
        }
      }
    });

    console.log('✅ LINE Pay 付款確認成功 (包含訂閱處理):', orderId);
    
    // ✅ 根據訂單類型決定跳轉位置
    const orderItemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const isAllSubscription = orderItemsList.every(item => item.itemType === 2);
    
    if (isAllSubscription) {
      // ✅ 訂閱方案跳轉到訂閱成功頁面
      res.redirect(`${frontendUrl}/subscription-success?orderId=${orderId}&orderNumber=${order.orderNumber}&transactionId=${transactionId}`);
    } else {
      // 活動訂單跳轉到一般成功頁面
      res.redirect(`${frontendUrl}/order-success/${order.orderNumber}?orderId=${orderId}&transactionId=${transactionId}`);
    }

  } catch (error) {
    console.error('❌ LINE Pay 確認處理失敗:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/error?message=付款確認失敗`);
  }
};

const checkLinePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      ));

    if (!order) {
      return res.status(404).json({
        error: '找不到訂單',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const response = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      transactionId: order.transactionId,
      paidAt: order.paidAt ? dayjs(order.paidAt).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss') : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ? dayjs(order.updatedAt).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss') : null,
      linePayStatus: null
    };

    if (order.paymentMethod === 'linepay') {
      const transactionId = order.transactionId || order.paymentId;
      
      if (transactionId) {
        console.log('🔍 查詢 LINE Pay 狀態:', transactionId);
        
        try {
          const statusResult = await LinePayProvider.checkPaymentStatus(transactionId);
          
          if (statusResult.success) {
            response.linePayStatus = {
              transactionId: transactionId,
              status: statusResult.status,
              isPaid: statusResult.isPaid,
              amount: statusResult.amount,
              currency: statusResult.currency
            };

            if (statusResult.isPaid && order.status === 'pending') {
              console.log('🔄 同步付款狀態:', orderId);
              
              await db.transaction(async (tx) => {
                await tx.update(orders).set({
                  status: 'confirmed',
                  paidAt: dayjs().tz('Asia/Taipei').toDate(),
                  updatedAt: dayjs().tz('Asia/Taipei').toDate()
                }).where(eq(orders.id, orderId));

                const orderItemsList = await db
                  .select()
                  .from(orderItems)
                  .where(eq(orderItems.orderId, orderId));

                const eventItems = orderItemsList.filter(item => item.eventId && item.itemType === 1);
                if (eventItems.length > 0) {
                  const participationData = eventItems.map(item => ({
                    userId: order.userId,
                    eventId: item.eventId,
                    joinedAt: dayjs().tz('Asia/Taipei').toDate(),
                    updatedAt: dayjs().tz('Asia/Taipei').toDate()
                  }));
                  await tx.insert(userEventParticipationTable).values(participationData);
                }

                const subscriptionItems = orderItemsList.filter(item => item.itemType === 2 && item.subscriptionType);
                if (subscriptionItems.length > 0) {
                  const { subPlans } = require('../utils/subPlans');
                  const FlakeId = require('flake-idgen');
                  const intformat = require('biguint-format');
                  const flake = new FlakeId({ id: 1 });

                  for (const item of subscriptionItems) {
                    const plan = subPlans[item.subscriptionType];
                    if (plan) {
                      const subId = intformat(flake.next(), 'dec');
                      const now = dayjs().tz('Asia/Taipei').toDate();
                      
                      await tx.insert(subTable).values({
                        id: subId,
                        userId: order.userId,
                        subType: item.subscriptionType,
                        price: item.price,
                        startAt: now,
                        endAt: dayjs(now).add(plan.duration, 'day').toDate(),
                        status: 1,
                        createAt: now,
                        modifyAt: now,
                      });

                      await tx.update(orderItems)
                        .set({ subscriptionId: subId })
                        .where(eq(orderItems.id, item.id));
                    }
                  }
                }
              });

              response.status = 'confirmed';
              response.paidAt = dayjs().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
              
              console.log('✅ 付款狀態已同步');
            }
          } else {
            response.linePayStatus = {
              transactionId: transactionId,
              status: 'QUERY_FAILED',
              isPaid: order.status === 'confirmed',
              amount: order.totalAmount,
              currency: 'TWD',
              error: '無法查詢 LINE Pay 即時狀態，顯示本地記錄'
            };
          }
        } catch (error) {
          console.error('❌ LINE Pay 狀態查詢異常:', error);
          
          response.linePayStatus = {
            transactionId: transactionId,
            status: 'API_ERROR',
            isPaid: order.status === 'confirmed',
            amount: order.totalAmount,
            currency: 'TWD',
            error: 'LINE Pay API 查詢失敗'
          };
        }
      } else {
        response.linePayStatus = {
          transactionId: null,
          status: 'NO_TRANSACTION_ID',
          isPaid: order.status === 'confirmed',
          amount: order.totalAmount,
          currency: 'TWD',
          note: 'LINE Pay 訂單但無交易記錄'
        };
      }
    }

    res.json(response);

  } catch (error) {
    return handleError(error, res);
  }
};

const refundLinePayment = async (req, res) => {
 try {
   const { orderId } = req.params;
   const { reason } = req.body;

   if (req.user.role !== 'admin') {
     return res.status(403).json({
       error: '無權限執行退款',
       code: 'FORBIDDEN'
     });
   }

   const [order] = await db
     .select()
     .from(orders)
     .where(eq(orders.id, orderId));

   if (!order) {
     return res.status(404).json({
       error: '找不到訂單',
       code: 'ORDER_NOT_FOUND'
     });
   }

   if (order.status !== 'confirmed' && order.status !== 'paid') {
     return res.status(400).json({
       error: '只能退款已確認的訂單',
       code: 'INVALID_ORDER_STATUS'
     });
   }

   if (!order.paymentId || order.paymentMethod !== 'linepay') {
     return res.status(400).json({
       error: '非 LINE Pay 付款，無法退款',
       code: 'INVALID_PAYMENT_METHOD'
     });
   }

   const refundResult = await LinePayProvider.refundPayment(
     order.paymentId,
     order.totalAmount,
     'TWD'
   );

   if (!refundResult.success) {
     return res.status(400).json({
       error: 'LINE Pay 退款失敗',
       message: refundResult.message,
       code: refundResult.code || 'REFUND_FAILED'
     });
   }

   await db.transaction(async (tx) => {
     await tx.update(orders).set({
       status: 'refunded',
       refundId: refundResult.refundTransactionId,
       refundedAt: dayjs().tz('Asia/Taipei').toDate(),
       cancellationReason: reason || 'LINE Pay 退款',
       updatedAt: dayjs().tz('Asia/Taipei').toDate()
     }).where(eq(orders.id, orderId));

     const orderItemsList = await db
       .select()
       .from(orderItems)
       .where(eq(orderItems.orderId, orderId));

     const eventIds = orderItemsList.map(item => item.eventId).filter(Boolean);
     if (eventIds.length > 0) {
       await tx
         .delete(userEventParticipationTable)
         .where(and(
           eq(userEventParticipationTable.userId, order.userId),
           inArray(userEventParticipationTable.eventId, eventIds)
         ));
     }

     const subscriptionIds = orderItemsList.map(item => item.subscriptionId).filter(Boolean);
     if (subscriptionIds.length > 0) {
       await tx
         .update(subTable)
         .set({ 
           status: 2, 
           modifyAt: dayjs().tz('Asia/Taipei').toDate() 
         })
         .where(inArray(subTable.id, subscriptionIds));
     }
   });

   res.json({
     success: true,
     message: 'LINE Pay 退款成功',
     data: {
       orderId: orderId,
       refundTransactionId: refundResult.refundTransactionId,
       refundAmount: refundResult.refundAmount,
       refundedAt: dayjs().tz('Asia/Taipei').toISOString()
     }
   });

 } catch (error) {
   return handleError(error, res);
 }
};

module.exports = {
 createLinePayment,
 confirmLinePayment,
 checkLinePaymentStatus,
 refundLinePayment
}