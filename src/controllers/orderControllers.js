const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and, inArray, count } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

// ==================== 常數定義 ====================
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

// ==================== 工具函數 ====================
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

// ==================== 驗證函數 ====================
const validateOrderInput = (userId, items) => {
  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error('缺少必要資料：userId 和 items 是必填的');
  }
  
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum) || userIdNum <= 0) {
    throw new Error('userId 必須是有效的正整數');
  }
  
  if (items.length > 10) {
    throw new Error('單次訂單最多只能購買 10 個活動的票券');
  }
  
  const eventIds = items.map(item => item.eventId?.toString()).filter(Boolean);
  if (eventIds.length !== items.length) {
    throw new Error('所有商品都必須提供有效的 eventId');
  }
  
  const uniqueEventIds = new Set(eventIds);
  if (eventIds.length !== uniqueEventIds.size) {
    throw new Error('訂單中不能包含重複的活動');
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.eventId || !item.quantity) {
      throw new Error(`第 ${i + 1} 個商品缺少 eventId 或 quantity`);
    }
    if (item.quantity !== 1) {
      throw new Error(`第 ${i + 1} 個商品格式錯誤：每個活動只能購買 1 張票`);
    }
  }
  
  return true;
};

const validateAndGetEvents = async (items) => {
  const now = new Date();
  let totalAmount = 0;
  const validatedItems = [];
  const eventIds = items.map(item => item.eventId.toString());
  
  // 批量查詢活動
  const eventList = await db
    .select()
    .from(events)
    .where(and(inArray(events.id, eventIds), eq(events.status, 1)));
  
  // 建立活動映射
  const eventMap = eventList.reduce((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {});
  
  // 逐一驗證活動
  for (const item of items) {
    const eventId = item.eventId.toString();
    const event = eventMap[eventId];
    
    if (!event) {
      throw new Error(`找不到活動 ID: ${eventId} 或活動已被刪除`);
    }
    
    if (new Date(event.endDate) < now) {
      throw new Error(`活動「${event.name}」已結束，無法購買`);
    }
    
    // 檢查人數限制
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
  
  // 檢查重複參加
  const eventIds = items.map(item => item.eventId.toString());
  const existingParticipations = await db
    .select({ eventId: userEventParticipationTable.eventId })
    .from(userEventParticipationTable)
    .where(and(
      eq(userEventParticipationTable.userId, parseInt(userId)),
      inArray(userEventParticipationTable.eventId, eventIds)
    ));
  
  if (existingParticipations.length > 0) {
    const duplicateEventIds = existingParticipations.map(p => p.eventId);
    const duplicateEvents = await db
      .select({ id: events.id, name: events.name })
      .from(events)
      .where(inArray(events.id, duplicateEventIds));
    
    const eventNames = duplicateEvents.map(e => e.name).join('、');
    throw new Error(`您已經參加過以下活動，無法重複購票：${eventNames}`);
  }
};

// ==================== 資料庫操作函數 ====================
const findOrder = async (orderId) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    throw new Error('找不到訂單');
  }
  return order;
};

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

const createParticipationRecords = async (tx, userId, orderItemsList) => {
  const participationData = orderItemsList.map(item => ({
    userId: parseInt(userId),
    eventId: item.eventId,
    joinedAt: new Date(),
    updatedAt: new Date()
  }));
  
  if (participationData.length > 0) {
    await tx.insert(userEventParticipationTable).values(participationData);
  }
  
  return participationData;
};

const removeParticipationRecords = async (tx, userId, eventIds) => {
  await tx
    .delete(userEventParticipationTable)
    .where(and(
      eq(userEventParticipationTable.userId, parseInt(userId)),
      inArray(userEventParticipationTable.eventId, eventIds)
    ));
};

// ==================== API 函數 ====================
const createOrder = async (req, res) => {
  try {
    const { userId, items, paymentMethod, customerName, customerPhone, customerEmail } = req.body;
    
    const result = await db.transaction(async (tx) => {
      // 驗證輸入
      validateOrderInput(userId, items);
      
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
      
      // 插入訂單和項目
      await tx.insert(orders).values(newOrder);
      const orderItemsCreated = await createOrderItemsBatch(tx, orderId, validatedItems);
      
      return {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        itemCount: validatedItems.length,
        items: validatedItems,
        orderItems: orderItemsCreated.map(item => stringifyBigInts(item)),
        allowedNextStates: STATE_TRANSITIONS[ORDER_STATUS.PENDING]
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
    
    res.json({ order: stringifyBigInts({ ...order, allowedNextStates }) });
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
    
    res.json({ 
      order: stringifyBigInts({ 
        ...order, 
        items, 
        allowedNextStates
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
        allowedTransitions: STATE_TRANSITIONS[order.status]
      });
    }
    
    // 使用交易處理狀態更新
    await db.transaction(async (tx) => {
      const updateData = { status: newStatus, updatedAt: new Date() };
      
      // 狀態特定處理
      if (newStatus === ORDER_STATUS.PAID) {
        if (!paymentId) {
          throw new Error('付款狀態更新需要提供 paymentId');
        }
        updateData.paymentId = paymentId;
        updateData.paidAt = new Date();
        
      } else if (newStatus === ORDER_STATUS.CONFIRMED) {
        if (order.status !== ORDER_STATUS.PAID) {
          throw new Error('只有已付款訂單可以確認');
        }
        updateData.confirmedAt = new Date();
        
        // 🎯 確認訂單時，自動創建參加記錄
        const orderItemsList = await getOrderItemsByOrderId(req.params.id);
        await createParticipationRecords(tx, order.userId, orderItemsList);
        
      } else if (newStatus === ORDER_STATUS.REFUNDED) {
        updateData.refundedAt = new Date();
        
        // 🎯 退款時，自動移除參加記錄
        const orderItemsList = await getOrderItemsByOrderId(req.params.id);
        const eventIds = orderItemsList.map(item => item.eventId);
        await removeParticipationRecords(tx, order.userId, eventIds);
        
      } else if (newStatus === ORDER_STATUS.EXPIRED) {
        updateData.expiredAt = new Date();
        
      } else if (newStatus === ORDER_STATUS.CANCELLED) {
        return res.status(400).json({
          message: '請使用 DELETE 方法取消訂單'
        });
      }
      
      // 更新訂單狀態
      await tx.update(orders).set(updateData).where(eq(orders.id, req.params.id));
    });
    
    res.json({
      message: '訂單狀態已更新',
      orderId: req.params.id,
      previousStatus: order.status,
      newStatus,
      allowedNextStates: STATE_TRANSITIONS[newStatus],
      participationUpdated: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REFUNDED].includes(newStatus)
    });
    
  } catch (err) {
    console.error('更新訂單狀態失敗:', err);
    const statusCode = err.message === '找不到訂單' ? 404 : 400;
    res.status(statusCode).json({ message: err.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        message: '缺少必要參數：userId'
      });
    }
    
    const order = await findOrder(req.params.id);
    

    if (order.userId !== parseInt(userId)) {
      return res.status(403).json({ 
        message: '無權限取消此訂單'
      });
    }
    
    if (order.status !== ORDER_STATUS.PENDING) {
      return res.status(400).json({
        message: `無法取消狀態為 ${order.status} 的訂單`,
        currentStatus: order.status
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
        cancellationReason: updateData.cancellationReason
      }
    });
    
  } catch (err) {
    console.error('取消訂單失敗:', err);
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