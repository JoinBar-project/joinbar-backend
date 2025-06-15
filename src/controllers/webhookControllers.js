const db = require('../config/db');
const { orders, userEventParticipationTable, orderItems } = require('../models/schema');
const { eq, and, inArray } = require('drizzle-orm');
const dayjs = require('dayjs');

const handlePaymentWebhook = async (req, res) => {
 try {
   console.log('🔔 收到 LINE Pay Webhook:', JSON.stringify(req.body, null, 2));
   
   const webhookData = req.body;
   const {
     orderId,
     transactionId,
     status,
     amount,
     currency,
     paidAt
   } = parseWebhookData(webhookData);
   
   if (!orderId || !transactionId) {
     console.error('❌ Webhook 資料不完整:', {
       orderId: orderId || 'missing',
       transactionId: transactionId || 'missing'
     });
     return res.status(400).json({ 
       error: 'Invalid webhook data',
       code: 'INVALID_WEBHOOK_DATA'
     });
   }
   
   if (!/^\d+$/.test(orderId)) {
     console.error('❌ orderId 格式無效:', orderId);
     return res.status(400).json({ 
       error: 'Invalid order ID format',
       code: 'INVALID_ORDER_ID'
     });
   }
   
   console.log(`🔍 查找訂單: ${orderId}`);
   
   let order;
   try {
     const [orderResult] = await db
       .select()
       .from(orders)
       .where(eq(orders.id, orderId));
     
     order = orderResult;
   } catch (dbError) {
     console.error('❌ 資料庫查詢錯誤:', {
       orderId,
       error: dbError.message
     });
     return res.status(500).json({ 
       error: 'Database query failed',
       code: 'DATABASE_ERROR'
     });
   }
   
   if (!order) {
     console.error('❌ 找不到訂單:', orderId);
     return res.status(404).json({ 
       error: 'Order not found',
       code: 'ORDER_NOT_FOUND'
     });
   }
   
   console.log(`📋 找到訂單: ${orderId}, 當前狀態: ${order.status}`);
   
   if (order.status !== 'pending') {
     console.log(`ℹ️ 訂單已處理過: ${orderId}, 狀態: ${order.status}`);
     return res.status(200).json({ 
       message: 'Already processed',
       orderId: orderId,
       currentStatus: order.status
     });
   }
   
   if (amount && Math.abs(order.totalAmount - amount) > 0.01) {
     console.error('❌ 金額不符:', {
       orderAmount: order.totalAmount,
       webhookAmount: amount
     });
     return res.status(400).json({ 
       error: 'Amount mismatch',
       code: 'AMOUNT_MISMATCH'
     });
   }
   
   await db.transaction(async (tx) => {
     let newStatus = 'paid';
     const updateData = {
       status: newStatus,
       paidAt: paidAt ? dayjs(paidAt).tz('Asia/Taipei').toDate() : dayjs().tz('Asia/Taipei').toDate(),
       paymentId: transactionId,
       updatedAt: dayjs().tz('Asia/Taipei').toDate()
     };
     
     const normalizedStatus = status ? status.toLowerCase() : '';
     
     switch (normalizedStatus) {
       case 'success':
       case 'paid':
       case 'completed':
         newStatus = 'confirmed';
         updateData.status = newStatus;
         
         console.log(`💰 處理付款成功: ${orderId}`);
         
         await tx.update(orders).set(updateData).where(eq(orders.id, orderId));
         
         try {
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
             console.log(`✅ 已加入 ${participationData.length} 個活動參與記錄`);
           }
         } catch (participationError) {
           console.error('❌ 加入活動參與失敗:', participationError);
         }
         
         console.log(`✅ 付款成功並確認訂單: ${orderId}`);
         break;
         
       case 'failed':
       case 'cancelled':
       case 'error':
         updateData.status = 'cancelled';
         updateData.cancellationReason = '付款失敗';
         updateData.cancelledAt = dayjs().tz('Asia/Taipei').toDate();
         delete updateData.paidAt;
         
         await tx.update(orders).set(updateData).where(eq(orders.id, orderId));
         
         console.log(`❌ 付款失敗，取消訂單: ${orderId}`);
         break;
         
       case 'pending':
       case 'processing':
         updateData.status = 'pending';
         delete updateData.paidAt;
         
         await tx.update(orders).set(updateData).where(eq(orders.id, orderId));
         
         console.log(`⏳ 付款處理中: ${orderId}`);
         break;
         
       default:
         console.warn(`⚠️ 未知的付款狀態: ${status}`);
         delete updateData.status;
         if (Object.keys(updateData).length > 1) {
           await tx.update(orders).set(updateData).where(eq(orders.id, orderId));
         }
     }
   });
   
   res.status(200).json({ 
     message: 'Webhook processed successfully',
     orderId: orderId,
     status: 'processed',
     timestamp: dayjs().tz('Asia/Taipei').toISOString()
   });
   
   console.log(`✅ Webhook 處理完成: ${orderId}`);
   
 } catch (error) {
   console.error('❌ Webhook 處理失敗:', {
     error: error.message,
     stack: error.stack
   });
   
   return res.status(500).json({ 
     error: 'Webhook processing failed',
     message: error.message,
     code: 'WEBHOOK_ERROR'
   });
 }
};

const handleRefundWebhook = async (req, res) => {
 try {
   console.log('🔔 收到退款 Webhook:', JSON.stringify(req.body, null, 2));
   
   const webhookData = req.body;
   const {
     orderId,
     refundId,
     amount,
     status,
     refundedAt
   } = parseRefundWebhookData(webhookData);
   
   if (!orderId || !refundId) {
     console.error('❌ 退款 Webhook 資料不完整:', {
       orderId: orderId || 'missing',
       refundId: refundId || 'missing'
     });
     return res.status(400).json({ 
       error: 'Invalid refund webhook data',
       code: 'INVALID_REFUND_DATA'
     });
   }
   
   let order;
   try {
     const [orderResult] = await db
       .select()
       .from(orders)
       .where(eq(orders.id, orderId));
     
     order = orderResult;
   } catch (dbError) {
     console.error('❌ 退款時資料庫查詢錯誤:', dbError);
     return res.status(500).json({ 
       error: 'Database query failed',
       code: 'DATABASE_ERROR'
     });
   }
   
   if (!order) {
     console.error('❌ 退款時找不到訂單:', orderId);
     return res.status(404).json({ 
       error: 'Order not found for refund',
       code: 'REFUND_ORDER_NOT_FOUND'
     });
   }
   
   const normalizedStatus = status ? status.toLowerCase() : '';
   if (normalizedStatus === 'refunded' || normalizedStatus === 'success' || normalizedStatus === 'completed') {
     await db.transaction(async (tx) => {
       await tx.update(orders).set({
         status: 'refunded',
         refundId: refundId,
         refundedAt: refundedAt ? dayjs(refundedAt).tz('Asia/Taipei').toDate() : dayjs().tz('Asia/Taipei').toDate(),
         updatedAt: dayjs().tz('Asia/Taipei').toDate()
       }).where(eq(orders.id, orderId));
       
       try {
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
             
           console.log(`🗑️ 已移除 ${eventIds.length} 個活動參與記錄`);
         }
       } catch (participationError) {
         console.error('❌ 移除活動參與記錄失敗:', participationError);
       }
     });
     
     console.log(`✅ 退款成功: ${orderId}`);
   }
   
   res.status(200).json({ 
     message: 'Refund webhook processed successfully',
     orderId: orderId,
     refundId: refundId,
     status: 'processed'
   });
   
 } catch (error) {
   console.error('❌ 退款 Webhook 處理失敗:', {
     error: error.message,
     stack: error.stack
   });
   return res.status(500).json({ 
     error: 'Refund webhook processing failed',
     message: error.message,
     code: 'REFUND_WEBHOOK_ERROR'
   });
 }
};

const parseWebhookData = (webhookData) => {
 try {
   const result = {
     orderId: webhookData.orderId || webhookData.order_id || webhookData.merchantOrderId,
     transactionId: webhookData.transactionId || webhookData.transaction_id || webhookData.paymentId,
     status: webhookData.status || webhookData.payment_status || webhookData.transactionStatus,
     amount: parseFloat(webhookData.amount || webhookData.total_amount || webhookData.paymentAmount || 0),
     currency: webhookData.currency || 'TWD',
     paidAt: webhookData.paidAt || webhookData.paid_at || webhookData.paymentTime
   };
   
   return result;
 } catch (error) {
   console.error('❌ 解析 Webhook 資料失敗:', error);
   throw new Error('Invalid webhook data format');
 }
};

const parseRefundWebhookData = (webhookData) => {
 try {
   const result = {
     orderId: webhookData.orderId || webhookData.order_id || webhookData.merchantOrderId,
     refundId: webhookData.refundId || webhookData.refund_id || webhookData.refundTransactionId,
     amount: parseFloat(webhookData.amount || webhookData.refund_amount || 0),
     status: webhookData.status || webhookData.refund_status,
     refundedAt: webhookData.refundedAt || webhookData.refunded_at || webhookData.refundTime
   };
   
   return result;
 } catch (error) {
   console.error('❌ 解析退款 Webhook 資料失敗:', error);
   throw new Error('Invalid refund webhook data format');
 }
};

const validateWebhookSource = (req) => {
 if (process.env.NODE_ENV === 'development') {
   return true;
 }
 
 const userAgent = req.get('User-Agent') || '';
 const clientIP = req.ip || req.connection.remoteAddress;
 
 console.log('📥 Webhook 來源:', {
   ip: clientIP,
   userAgent: userAgent,
   timestamp: new Date().toISOString()
 });
 
 return true;
};

module.exports = {
 handlePaymentWebhook,
 handleRefundWebhook,
 parseWebhookData,
 parseRefundWebhookData,
 validateWebhookSource
};