const db = require('../config/db');
const { orders, orderItems, userEventParticipationTable } = require('../models/schema');
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
   
   const [order] = await db
     .select()
     .from(orders)
     .where(and(
       eq(orders.id, orderId),
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
   
   const paymentData = {
     orderId: order.id,
     orderNumber: order.orderNumber,
     amount: order.totalAmount,
     currency: 'TWD',
     description: `活動訂票 - ${orderItemsList.length} 個活動`,
     returnUrl: `${backendUrl}/api/linepay/confirm?orderId=${order.id}`,
     cancelUrl: `${frontendUrl}/payment/cancel?orderId=${order.id}`,
     packages: [{
       id: `package_${order.id}`,
       amount: order.totalAmount,
       name: '活動票券',
       products: orderItemsList.map((item, index) => ({
         id: `product_${item.id}`,
         name: `${item.eventName} - ${item.barName}`,
         quantity: item.quantity,
         price: item.price
       }))
     }]
   };

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
       orderId: order.id,
       orderNumber: order.orderNumber,
       amount: order.totalAmount,
       transactionId: paymentResult.transactionId,
       paymentUrl: paymentResult.paymentUrl,
       expireTime: dayjs().add(15, 'minute').toISOString()
     }
   });

 } catch (error) {
   return handleError(error, res);
 }
};

const confirmLinePayment = async (req, res) => {
 try {
   const { transactionId, orderId } = req.query;
   const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

   console.log('LINE Pay 確認回調:', { transactionId, orderId });

   if (!transactionId || !orderId) {
     console.error('缺少必要參數:', { transactionId, orderId });
     return res.redirect(`${frontendUrl}/payment/error?message=缺少付款參數`);
   }

   const [order] = await db
     .select()
     .from(orders)
     .where(eq(orders.id, orderId));

   if (!order) {
     console.error('找不到訂單:', orderId);
     return res.redirect(`${frontendUrl}/payment/error?message=找不到訂單`);
   }

   if (order.status === 'confirmed') {
     console.log('訂單已確認:', orderId);
     return res.redirect(`${frontendUrl}/payment/success?orderId=${orderId}`);
   }

   if (order.status !== 'pending') {
     console.log('訂單狀態異常:', order.status);
     return res.redirect(`${frontendUrl}/payment/error?message=訂單狀態異常`);
   }

   const confirmResult = await LinePayProvider.confirmPayment(
     transactionId,
     order.totalAmount,
     'TWD'
   );

   if (!confirmResult.success) {
     console.error('LINE Pay 確認失敗:', confirmResult);
     return res.redirect(`${frontendUrl}/payment/error?message=${confirmResult.message}`);
   }

   await db.transaction(async (tx) => {
     await tx.update(orders).set({
       status: 'confirmed',
       paidAt: dayjs().tz('Asia/Taipei').toDate(),
       transactionId: confirmResult.transactionId,
       updatedAt: dayjs().tz('Asia/Taipei').toDate()
     }).where(eq(orders.id, orderId));

     const orderItemsList = await db
       .select()
       .from(orderItems)
       .where(eq(orderItems.orderId, orderId));

     const participationData = orderItemsList.map(item => ({
       userId: order.userId,
       eventId: item.eventId,
       joinedAt: dayjs().tz('Asia/Taipei').toDate(),
       updatedAt: dayjs().tz('Asia/Taipei').toDate()
     }));

     if (participationData.length > 0) {
       await tx.insert(userEventParticipationTable).values(participationData);
     }
   });

   console.log('LINE Pay 付款確認成功:', orderId);
   
   res.redirect(`${frontendUrl}/payment/success?orderId=${orderId}&transactionId=${transactionId}`);

 } catch (error) {
   console.error('LINE Pay 確認處理失敗:', error);
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

                if (orderItemsList.length > 0) {
                  const participationData = orderItemsList.map(item => ({
                    userId: order.userId,
                    eventId: item.eventId,
                    joinedAt: dayjs().tz('Asia/Taipei').toDate(),
                    updatedAt: dayjs().tz('Asia/Taipei').toDate()
                  }));

                  await tx.insert(userEventParticipationTable).values(participationData);
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

     const eventIds = orderItemsList.map(item => item.eventId);

     if (eventIds.length > 0) {
       await tx
         .delete(userEventParticipationTable)
         .where(and(
           eq(userEventParticipationTable.userId, order.userId),
           inArray(userEventParticipationTable.eventId, eventIds)
         ));
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