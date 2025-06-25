const db = require('../config/db');
const { orders, orderItems, userEventParticipationTable, subTable } = require('../models/schema');
const { eq, and, inArray } = require('drizzle-orm');
const LinePayProvider = require('../utils/linePayProvider');
const dayjs = require('dayjs');

const { subPlans } = require('../utils/subPlans');
const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');

const flakeIdGenerator = new FlakeId({ id: 1 });

const handleError = (err, res) => {
  console.error('LINE Pay 錯誤:', {
    message: err.message,
    stack: err.stack,
    timestamp: dayjs().toISOString()
  });
  
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

const validateOrderAmount = (orderItems, storedAmount) => {
  const calculatedAmount = orderItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * parseInt(item.quantity));
  }, 0);
  
  return Math.abs(calculatedAmount - parseFloat(storedAmount)) <= 1;
};

const processEventParticipation = async (tx, orderItemsList, userId) => {
  const eventItems = orderItemsList.filter(item => item.eventId && item.itemType === 1);
  if (eventItems.length === 0) return;

  const participationData = eventItems.map(item => ({
    userId: userId,
    eventId: item.eventId,
    joinedAt: dayjs().tz('Asia/Taipei').toDate(),
    updatedAt: dayjs().tz('Asia/Taipei').toDate()
  }));

  await tx.insert(userEventParticipationTable).values(participationData);
  console.log(`✅ 已建立 ${participationData.length} 個活動參與記錄`);
};

const processSubscriptions = async (tx, orderItemsList, userId) => {
  const subscriptionItems = orderItemsList.filter(item => item.itemType === 2 && item.subscriptionType);
  if (subscriptionItems.length === 0) return;

  console.log('📋 開始處理訂閱項目:', subscriptionItems.map(item => ({
    type: item.subscriptionType,
    price: item.price,
    itemId: item.id
  })));

  for (const item of subscriptionItems) {
    const plan = subPlans[item.subscriptionType];
    
    if (!plan) {
      console.error(`❌ 找不到訂閱方案: ${item.subscriptionType}`);
      throw new Error(`無效的訂閱方案: ${item.subscriptionType}`);
    }

    const subId = intformat(flakeIdGenerator.next(), 'dec');
    const now = dayjs().tz('Asia/Taipei').toDate();
    const startAt = now;
    const endAt = dayjs(now).add(plan.duration, 'day').toDate();

    await tx.insert(subTable).values({
      id: subId,
      userId: userId,
      subType: item.subscriptionType,
      price: item.price,
      startAt,
      endAt,
      status: 1,
      createAt: now,
      modifyAt: now,
    });

    if (item.id) {
      await tx.update(orderItems)
        .set({ subscriptionId: subId })
        .where(eq(orderItems.id, item.id));
    } else {
      console.warn(`⚠️ 訂單項目缺少 ID，無法更新 subscriptionId: ${JSON.stringify(item)}`);
    }

    console.log(`✅ 已建立訂閱服務:`, {
      subscriptionType: item.subscriptionType,
      subscriptionId: subId,
      duration: plan.duration,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString()
    });
  }

  console.log(`✅ 共處理 ${subscriptionItems.length} 個訂閱項目`);
};

const createLinePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;
    
    if (!orderId) {
      return res.status(400).json({
        error: '缺少訂單 ID',
        code: 'MISSING_ORDER_ID'
      });
    }
    
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
      try {
        const statusCheck = await LinePayProvider.checkPaymentStatus(order.paymentId);
        if (statusCheck.success && !statusCheck.isPaid) {
          return res.json({
            success: true,
            message: '使用現有付款交易',
            data: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              transactionId: order.paymentId,
              message: '請完成您的 LINE Pay 付款'
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ 檢查現有付款狀態失敗:', error.message);
      }
    }

    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    if (!orderItemsList.length) {
      return res.status(400).json({
        error: '訂單項目不存在',
        code: 'ORDER_ITEMS_NOT_FOUND'
      });
    }

    if (!validateOrderAmount(orderItemsList, order.totalAmount)) {
      console.error('❌ 訂單金額不匹配:', {
        orderId,
        calculated: orderItemsList.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0),
        stored: order.totalAmount
      });
      return res.status(400).json({
        error: '訂單金額異常',
        code: 'AMOUNT_MISMATCH'
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    const isAllSubscription = orderItemsList.every(item => item.itemType === 2);
    const isAllEvent = orderItemsList.every(item => item.itemType === 1);
    
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
    } else if (isAllEvent) {
      description = `活動訂票 - ${orderItemsList.length} 個活動`;
      packageName = '活動票券';
      products = orderItemsList.map((item, index) => ({
        id: `product_${String(item.id)}`, 
        name: item.eventName ? `${item.eventName} - ${item.barName || ''}` : `活動 ${index + 1}`,
        quantity: Number(item.quantity),   
        price: Number(item.price)           
      }));
    } else {
      return res.status(400).json({
        error: '訂單商品類型異常',
        code: 'INVALID_ITEM_TYPE'
      });
    }

    const paymentData = {
      orderId: String(order.id),
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      currency: 'TWD',
      description: description,
      returnUrl: returnUrl,  
      cancelUrl: cancelUrl,
      packages: [{
        id: `package_${String(order.id)}`,
        amount: Number(order.totalAmount),
        name: packageName,
        products: products
      }]
    };

    console.log('🔍 準備 LINE Pay 付款數據:', {
      orderId: paymentData.orderId,
      orderNumber: paymentData.orderNumber,
      amount: paymentData.amount,
      productCount: products.length
    });

    const paymentResult = await LinePayProvider.createPayment(paymentData);
    
    if (!paymentResult.success) {
      console.error('❌ LINE Pay 創建失敗:', {
        orderId,
        error: paymentResult.message,
        code: paymentResult.code
      });
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

    console.log('✅ LINE Pay 付款創建成功:', {
      orderId: String(order.id),
      transactionId: paymentResult.transactionId
    });

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

const confirmLinePayment = async (req, res) => {
  try {
    const { transactionId, orderId } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    console.log('🔄 LINE Pay 確認回調:', { transactionId, orderId });

    if (!transactionId || !orderId) {
      console.error('❌ 缺少必要參數:', { transactionId, orderId });
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('缺少付款參數')}`);
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      console.error('❌ 找不到訂單:', orderId);
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('找不到訂單')}`);
    }

    const orderItemsList = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        itemType: orderItems.itemType,
        eventId: orderItems.eventId,
        subscriptionId: orderItems.subscriptionId,
        subscriptionType: orderItems.subscriptionType,
        price: orderItems.price,
        quantity: orderItems.quantity,
        subtotal: orderItems.subtotal
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    console.log('🔍 訂單項目詳細資料:', JSON.stringify(orderItemsList, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2
    ));

    if (!orderItemsList.length) {
      console.error('❌ 訂單項目不存在:', orderId);
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('訂單項目不存在')}`);
    }

    if (!validateOrderAmount(orderItemsList, order.totalAmount)) {
      console.error('❌ 訂單金額不匹配:', {
        orderId,
        calculated: orderItemsList.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0),
        stored: order.totalAmount
      });
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('訂單金額異常')}`);
    }

    const getSuccessUrl = () => {
      const baseParams = `orderId=${orderId}&orderNumber=${order.orderNumber}&transactionId=${transactionId}`;
      
      if (!orderItemsList || orderItemsList.length === 0) {
        console.error('❌ orderItemsList 為空或未定義');
        return `${frontendUrl}/payment/error?message=${encodeURIComponent('訂單項目不存在')}`;
      }
      
      const hasSubscription = orderItemsList.some(item => {
        console.log('🔍 檢查訂閱項目:', { id: item.id, itemType: item.itemType, subscriptionType: item.subscriptionType });
        return item.itemType === 2;
      });
      
      const hasEvent = orderItemsList.some(item => {
        console.log('🔍 檢查活動項目:', { id: item.id, itemType: item.itemType, eventId: item.eventId });
        return item.itemType === 1;
      });
      
      console.log('🎯 跳轉決策分析:', {
        totalItems: orderItemsList.length,
        hasSubscription,
        hasEvent,
        itemsBreakdown: orderItemsList.map(item => ({
          id: item.id,
          itemType: item.itemType,
          isSubscription: item.itemType === 2,
          isEvent: item.itemType === 1,
          subscriptionType: item.subscriptionType,
          eventId: item.eventId
        }))
      });
      
      if (hasSubscription && !hasEvent) {
        const subscriptionUrl = `${frontendUrl}/payment-result?${baseParams}`;
        console.log('✅ 決定跳轉到訂閱成功頁:', subscriptionUrl);
        return subscriptionUrl;
      } else {
        const eventUrl = `${frontendUrl}/order-success/${order.orderNumber}?${baseParams}`;
        console.log('✅ 決定跳轉到活動成功頁:', eventUrl);
        return eventUrl;
      }
    };

    if (order.status === 'confirmed') {
      console.log('✅ 訂單已確認，直接跳轉:', orderId);
      return res.redirect(getSuccessUrl());
    }

    if (order.status !== 'pending') {
      console.log('⚠️ 訂單狀態異常:', { orderId, status: order.status });
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('訂單狀態異常')}`);
    }

    console.log('🔄 開始 LINE Pay 付款確認...', { transactionId, amount: order.totalAmount });
    const confirmResult = await LinePayProvider.confirmPayment(
      transactionId,
      order.totalAmount,
      'TWD'
    );

    if (!confirmResult.success) {
      console.error('❌ LINE Pay 確認失敗:', {
        orderId,
        transactionId,
        error: confirmResult.message
      });
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent(confirmResult.message)}`);
    }

    console.log('✅ LINE Pay 確認成功，開始更新資料庫...', { orderId, transactionId });

    await db.transaction(async (tx) => {
      await tx.update(orders).set({
        status: 'confirmed',
        paidAt: dayjs().tz('Asia/Taipei').toDate(),
        transactionId: transactionId,
        updatedAt: dayjs().tz('Asia/Taipei').toDate()
      }).where(eq(orders.id, orderId));

      console.log('✅ 訂單狀態已更新為已確認，交易 ID:', transactionId);

      await processEventParticipation(tx, orderItemsList, order.userId);

      await processSubscriptions(tx, orderItemsList, order.userId);
    });

    console.log('✅ LINE Pay 付款確認完成，準備跳轉成功頁面');

    res.redirect(getSuccessUrl());

  } catch (error) {
    console.error('❌ LINE Pay 確認處理失敗:', {
      orderId: req.query.orderId,
      transactionId: req.query.transactionId,
      error: error.message,
      stack: error.stack
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('付款確認失敗，請聯繫客服')}`);
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
              
              const orderItemsList = await db
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, orderId));

              await db.transaction(async (tx) => {
                await tx.update(orders).set({
                  status: 'confirmed',
                  paidAt: dayjs().tz('Asia/Taipei').toDate(),
                  updatedAt: dayjs().tz('Asia/Taipei').toDate()
                }).where(eq(orders.id, orderId));

                await processEventParticipation(tx, orderItemsList, order.userId);

                await processSubscriptions(tx, orderItemsList, order.userId);
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

module.exports = {
  createLinePayment,
  confirmLinePayment,
  checkLinePaymentStatus
};