const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and, inArray, count } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

// ========== 狀態定義 ==========
const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid', 
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  EXPIRED: 'expired'
};

const STATE_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: [],
  [ORDER_STATUS.EXPIRED]: []
};

// ========== 工具函數 ==========
const stringifyBigInts = (obj) => JSON.parse(JSON.stringify(obj, (_, value) => 
  typeof value === 'bigint' ? value.toString() : value
));

const validateStatusTransition = (current, target) => 
  (STATE_TRANSITIONS[current] || []).includes(target);

const generateOrderId = () => {
  const orderId = intformat(flake.next(), 'dec');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const orderNumber = `ORDER-${today}-${Date.now().toString().slice(-6)}`;
  return { orderId, orderNumber };
};

const generateOrderSummary = (validatedItems) => {
  const summary = {
    totalItems: validatedItems.length,
    totalAmount: validatedItems.reduce((sum, item) => sum + item.price, 0),
    events: validatedItems.map(item => ({
      name: item.eventName,
      barName: item.barName,
      price: item.price,
      date: item.startDate
    })),
    bars: [...new Set(validatedItems.map(item => item.barName))],
    dateRange: {
      earliest: new Date(Math.min(...validatedItems.map(item => new Date(item.startDate)))),
      latest: new Date(Math.max(...validatedItems.map(item => new Date(item.endDate))))
    }
  };
  
  return summary;
};

// ========== 驗證函數 ==========
const validateOrderInput = (userId, items) => {
  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return '缺少必要資料：userId 和 items 是必填的';
  }
  
  // 檢查商品數量限制
  if (items.length > 10) {
    return '單次訂單最多只能購買 10 個活動的票券';
  }
  
  // 檢查是否有重複的活動ID
  const eventIds = items.map(item => item.eventId.toString());
  const uniqueEventIds = new Set(eventIds);
  if (eventIds.length !== uniqueEventIds.size) {
    return '訂單中不能包含重複的活動';
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.eventId || !item.quantity) {
      return `第 ${i + 1} 個商品缺少 eventId 或 quantity`;
    }
    if (item.quantity !== 1) {
      return `第 ${i + 1} 個商品格式錯誤：每個活動只能購買 1 張票`;
    }
  }
  return null;
};

const validateAndGetEvents = async (items) => {
  const now = new Date();
  let totalAmount = 0;
  const validatedItems = [];
  const eventIds = items.map(item => item.eventId.toString());
  
  // 批量查詢所有活動（效能優化）
  const eventList = await db
    .select()
    .from(events)
    .where(and(
      inArray(events.id, eventIds),
      eq(events.status, 1)
    ));
  
  // 建立活動查找映射
  const eventMap = eventList.reduce((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {});
  
  // 驗證每個活動
  for (const item of items) {
    const eventId = item.eventId.toString();
    const event = eventMap[eventId];
    
    if (!event) {
      throw new Error(`找不到活動 ID: ${eventId} 或活動已被刪除`);
    }
    
    if (new Date(event.endDate) < now) {
      throw new Error(`活動「${event.name}」已結束，無法購買`);
    }
    
    // 檢查活動人數限制
    if (event.maxPeople) {
      const [participantCount] = await db
        .select({ count: count() })
        .from(userEventParticipationTable)
        .where(eq(userEventParticipationTable.eventId, eventId));
      
      if (participantCount.count >= event.maxPeople) {
        throw new Error(`活動「${event.name}」已滿員，無法購買`);
      }
    }
    
    totalAmount += event.price;
    validatedItems.push({
      eventId,
      eventName: event.name,
      barName: event.barName,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      hostUserId: event.hostUser,
      price: event.price,
      quantity: 1
    });
  }
  
  return { totalAmount, validatedItems };
};

const checkDuplicatePurchase = async (userId, items) => {
  // 檢查未付款訂單
  const existingPendingOrders = await db
    .select({ orderId: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.userId, parseInt(userId)), eq(orders.status, ORDER_STATUS.PENDING)));
  
  if (existingPendingOrders.length > 0) {
    throw new Error(`您有 ${existingPendingOrders.length} 個未付款訂單，請先完成付款或取消現有訂單`);
  }
  
  // 批量檢查參加記錄
  const eventIds = items.map(item => item.eventId.toString());
  const existingParticipations = await db
    .select({ eventId: userEventParticipationTable.eventId })
    .from(userEventParticipationTable)
    .where(and(
      eq(userEventParticipationTable.userId, parseInt(userId)),
      inArray(userEventParticipationTable.eventId, eventIds)
    ));
  
  if (existingParticipations.length > 0) {
    // 查詢重複活動的名稱
    const duplicateEventIds = existingParticipations.map(p => p.eventId);
    const duplicateEvents = await db
      .select({ id: events.id, name: events.name })
      .from(events)
      .where(inArray(events.id, duplicateEventIds));
    
    const eventNames = duplicateEvents.map(e => e.name).join('、');
    throw new Error(`您已經參加過以下活動，無法重複購票：${eventNames}`);
  }
};

// ========== 資料庫操作函數 ==========
const createOrderItemsBatch = async (tx, orderId, validatedItems) => {
  const orderItemsData = validatedItems.map(item => {
    const itemId = intformat(flake.next(), 'dec');
    return {
      id: itemId,
      orderId: orderId,
      eventId: item.eventId,
      eventName: item.eventName,
      barName: item.barName,
      location: item.location,
      eventStartDate: item.startDate,
      eventEndDate: item.endDate,
      hostUserId: item.hostUserId,
      price: item.price.toString(),
      quantity: 1,
      subtotal: item.price.toString()
    };
  });
  
  if (orderItemsData.length > 0) {
    await tx.insert(orderItems).values(orderItemsData);
  }
  
  return orderItemsData;
};

const getOrderItemsByOrderId = async (orderId) => {
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.eventStartDate);
  
  return items.map(item => stringifyBigInts(item));
};

const findOrder = async (orderId) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    throw new Error('找不到訂單');
  }
  return order;
};

// ========== API 函數 ==========
const createOrder = async (req, res) => {
  try {
    const { userId, items, paymentMethod, customerName, customerPhone, customerEmail } = req.body;
    
    // 使用資料庫交易確保資料一致性
    const result = await db.transaction(async (tx) => {
      // 驗證輸入
      const validationError = validateOrderInput(userId, items);
      if (validationError) {
        throw new Error(validationError);
      }
      
      // 驗證活動並計算金額
      const { totalAmount, validatedItems } = await validateAndGetEvents(items);
      
      // 檢查重複購買
      await checkDuplicatePurchase(userId, items);
      
      // 生成訂單
      const { orderId, orderNumber } = generateOrderId();
      const now = new Date();
      
      const newOrder = {
        id: orderId,
        orderNumber,
        userId: parseInt(userId),
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        paymentMethod: paymentMethod || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        createdAt: now,
        updatedAt: now
      };
      
      // 插入訂單主表
      await tx.insert(orders).values(newOrder);
      
      // 批量插入訂單項目
      const orderItemsCreated = await createOrderItemsBatch(tx, orderId, validatedItems);
      
      // 生成訂單摘要
      const summary = generateOrderSummary(validatedItems);
      
      return {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        itemCount: validatedItems.length,
        items: validatedItems,
        orderItems: orderItemsCreated.map(item => stringifyBigInts(item)),
        summary,
        allowedNextStates: STATE_TRANSITIONS[ORDER_STATUS.PENDING],
        actions: { canPay: true, canCancel: true, canExpire: true }
      };
    });
    
    res.status(201).json({
      message: '訂單創建成功',
      order: result
    });
    
  } catch (err) {
    console.error('創建訂單失敗:', err);
    const statusCode = err.message.includes('找不到') ? 404 : 
                      err.message.includes('已結束') || err.message.includes('重複') || err.message.includes('已滿員') ? 400 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await findOrder(req.params.id);
    const allowedNextStates = STATE_TRANSITIONS[order.status] || [];
    const actions = {
      canPay: allowedNextStates.includes(ORDER_STATUS.PAID),
      canCancel: allowedNextStates.includes(ORDER_STATUS.CANCELLED),
      canConfirm: allowedNextStates.includes(ORDER_STATUS.CONFIRMED),
      canRefund: allowedNextStates.includes(ORDER_STATUS.REFUNDED)
    };
    
    res.json({ order: stringifyBigInts({ ...order, allowedNextStates, actions }) });
  } catch (err) {
    const statusCode = err.message === '找不到訂單' ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

const getOrderWithDetails = async (req, res) => {
  try {
    const order = await findOrder(req.params.id);
    const items = await getOrderItemsByOrderId(req.params.id);
    
    const allowedNextStates = STATE_TRANSITIONS[order.status] || [];
    const actions = {
      canPay: allowedNextStates.includes(ORDER_STATUS.PAID),
      canCancel: allowedNextStates.includes(ORDER_STATUS.CANCELLED),
      canConfirm: allowedNextStates.includes(ORDER_STATUS.CONFIRMED),
      canRefund: allowedNextStates.includes(ORDER_STATUS.REFUNDED)
    };
    
    // 基於實際儲存的項目重新生成摘要
    const summary = items.length > 0 ? {
      totalItems: items.length,
      totalAmount: items.reduce((sum, item) => sum + parseFloat(item.price), 0),
      bars: [...new Set(items.map(item => item.barName))],
      dateRange: {
        earliest: new Date(Math.min(...items.map(item => new Date(item.eventStartDate)))),
        latest: new Date(Math.max(...items.map(item => new Date(item.eventEndDate))))
      }
    } : null;
    
    res.json({ 
      order: stringifyBigInts({ 
        ...order, 
        items, 
        summary,
        allowedNextStates, 
        actions 
      }) 
    });
  } catch (err) {
    const statusCode = err.message === '找不到訂單' ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status: newStatus, paymentId } = req.body;
    const order = await findOrder(req.params.id);
    
    // 狀態機驗證
    if (!validateStatusTransition(order.status, newStatus)) {
      return res.status(400).json({
        message: `無法從 ${order.status} 轉換到 ${newStatus}`,
        currentStatus: order.status,
        allowedTransitions: STATE_TRANSITIONS[order.status],
        note: newStatus === ORDER_STATUS.CANCELLED ? '請使用 DELETE /api/orders/:id 取消訂單' : null
      });
    }
    
    // 準備更新資料
    const updateData = { status: newStatus, updatedAt: new Date() };
    
    // 狀態特定處理
    if (newStatus === ORDER_STATUS.PAID) {
      if (!paymentId) {
        return res.status(400).json({ message: '付款狀態更新需要提供 paymentId' });
      }
      updateData.paymentId = paymentId;
      updateData.paidAt = new Date();
      
    } else if (newStatus === ORDER_STATUS.CONFIRMED) {
      if (order.status !== ORDER_STATUS.PAID) {
        return res.status(400).json({ message: '只有已付款訂單可以確認' });
      }
      updateData.confirmedAt = new Date();
      
    } else if (newStatus === ORDER_STATUS.REFUNDED) {
      updateData.refundedAt = new Date();
      
    } else if (newStatus === ORDER_STATUS.EXPIRED) {
      updateData.expiredAt = new Date();
      
    } else if (newStatus === ORDER_STATUS.CANCELLED) {
      return res.status(400).json({
        message: '請使用 DELETE 方法取消訂單',
        correctMethod: 'DELETE /api/orders/:id',
        body: { userId: '用戶ID', reason: '取消原因（可選）' }
      });
    }
    
    await db.update(orders).set(updateData).where(eq(orders.id, req.params.id));
    
    res.json({
      message: '訂單狀態已更新',
      orderId: req.params.id,
      previousStatus: order.status,
      newStatus,
      allowedNextStates: STATE_TRANSITIONS[newStatus],
      timestamp: new Date()
    });
    
  } catch (err) {
    const statusCode = err.message === '找不到訂單' ? 404 : 400;
    res.status(statusCode).json({ message: err.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        message: '缺少必要參數：userId',
        required: ['userId'], 
        optional: ['reason'] 
      });
    }
    
    const order = await findOrder(req.params.id);
    
    // 權限檢查
    if (order.userId !== parseInt(userId)) {
      return res.status(403).json({ 
        message: '無權限取消此訂單',
        note: '只有訂單所有者可以取消訂單' 
      });
    }
    
    // 狀態檢查
    if (order.status !== ORDER_STATUS.PENDING) {
      const statusMessages = {
        [ORDER_STATUS.PAID]: '已付款訂單請申請退款',
        [ORDER_STATUS.CONFIRMED]: '已確認訂單無法取消',
        [ORDER_STATUS.CANCELLED]: '訂單已經是取消狀態',
        [ORDER_STATUS.REFUNDED]: '已退款訂單無法再次操作',
        [ORDER_STATUS.EXPIRED]: '已過期訂單無法取消'
      };
      
      return res.status(400).json({
        message: `無法取消狀態為 ${order.status} 的訂單`,
        currentStatus: order.status,
        note: statusMessages[order.status] || '此訂單已無法取消'
      });
    }
    
    // 狀態機驗證
    if (!validateStatusTransition(order.status, ORDER_STATUS.CANCELLED)) {
      return res.status(400).json({
        message: '系統不允許此狀態轉換',
        currentStatus: order.status,
        allowedTransitions: STATE_TRANSITIONS[order.status]
      });
    }
    
    // 執行取消
    const cancelledAt = new Date();
    const updateData = {
      status: ORDER_STATUS.CANCELLED,
      cancelledAt,
      cancellationReason: reason || '用戶主動取消',
      updatedAt: cancelledAt
    };
    
    await db.update(orders).set(updateData).where(eq(orders.id, req.params.id));
    
    res.json({
      message: '訂單已成功取消',
      order: {
        orderId: req.params.id,
        orderNumber: order.orderNumber,
        previousStatus: ORDER_STATUS.PENDING,
        newStatus: ORDER_STATUS.CANCELLED,
        cancelledAt,
        cancellationReason: updateData.cancellationReason,
        allowedNextStates: []
      }
    });
    
  } catch (err) {
    const statusCode = err.message === '找不到訂單' ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

module.exports = { 
  createOrder,
  getOrder,
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder,
  ORDER_STATUS,
  validateStatusTransition
};