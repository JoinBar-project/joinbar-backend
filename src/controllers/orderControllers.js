const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and, inArray, count } = require('drizzle-orm');
const { checkUserExists } = require('../middlewares/checkPermission');

const flake = new FlakeId({ id: 1 });

// 訂單狀態
const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid', 
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  EXPIRED: 'expired'
};

// 允許的狀態轉換
const STATE_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: [],
  [ORDER_STATUS.EXPIRED]: []
};

// 工具函數
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

// 簡化的錯誤處理
const handleError = (err, res) => {
  console.error('訂單錯誤:', err);
  
  if (err.message.includes('找不到')) return res.status(404).json({ message: err.message });
  if (err.message.includes('無權限')) return res.status(403).json({ message: err.message });
  if (err.message.includes('重複') || err.message.includes('已滿員')) return res.status(409).json({ message: err.message });
  if (err.message.includes('已結束') || err.message.includes('已停用')) return res.status(400).json({ message: err.message });
  
  return res.status(500).json({ message: '伺服器錯誤' });
};

// 驗證訂單輸入
const validateOrderInput = async (userId, items) => {
  await checkUserExists(userId);
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('items 不能為空');
  }
  
  if (items.length > 10) {
    throw new Error('單次訂單最多10個活動');
  }
  
  const eventIds = items.map(item => item.eventId?.toString()).filter(Boolean);
  if (eventIds.length !== items.length) {
    throw new Error('所有商品都需要eventId');
  }
  
  const uniqueEventIds = new Set(eventIds);
  if (eventIds.length !== uniqueEventIds.size) {
    throw new Error('不能包含重複的活動');
  }
  
  for (const item of items) {
    if (!item.eventId || item.quantity !== 1) {
      throw new Error('每個活動只能購買1張票');
    }
  }
  
  return true;
};

// 驗證活動並計算總金額
const validateAndGetEvents = async (items) => {
  const now = new Date();
  let totalAmount = 0;
  const validatedItems = [];
  const eventIds = items.map(item => item.eventId.toString());
  
  const eventList = await db
    .select()
    .from(events)
    .where(and(inArray(events.id, eventIds), eq(events.status, 1)));
  
  const eventMap = eventList.reduce((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {});
  
  for (const item of items) {
    const eventId = item.eventId.toString();
    const event = eventMap[eventId];
    
    if (!event) {
      throw new Error(`找不到活動 ID: ${eventId}`);
    }
    
    if (new Date(event.endDate) < now) {
      throw new Error(`活動「${event.name}」已結束`);
    }
    
    // 檢查人數限制
    if (event.maxPeople) {
      const [participantCount] = await db
        .select({ count: count() })
        .from(userEventParticipationTable)
        .where(eq(userEventParticipationTable.eventId, eventId));
      
      if (participantCount.count >= event.maxPeople) {
        throw new Error(`活動「${event.name}」已滿員`);
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

// 檢查重複購買
const checkDuplicatePurchase = async (userId, items) => {
  // 檢查未付款訂單
  const existingPendingOrders = await db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, ORDER_STATUS.PENDING)));
  
  if (existingPendingOrders[0].count > 0) {
    throw new Error('您有未付款訂單，請先完成付款或取消');
  }
  
  // 檢查重複參加
  const eventIds = items.map(item => item.eventId.toString());
  const existingParticipations = await db
    .select({ eventId: userEventParticipationTable.eventId })
    .from(userEventParticipationTable)
    .where(and(
      eq(userEventParticipationTable.userId, userId),
      inArray(userEventParticipationTable.eventId, eventIds)
    ));
  
  if (existingParticipations.length > 0) {
    throw new Error('您已經參加過這些活動，無法重複購票');
  }
};

// 資料庫操作函數
const findOrder = async (orderId) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    throw new Error('找不到訂單');
  }
  return order;
};

const createOrderItemsBatch = async (tx, orderId, validatedItems) => {
  const orderItemsData = validatedItems.map(item => ({
    id: intformat(flake.next(), 'dec'),
    orderId,
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
  }));
  
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

// API 函數
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, paymentMethod, customerName, customerPhone, customerEmail } = req.body;
    
    const result = await db.transaction(async (tx) => {
      await validateOrderInput(userId, items);
      const { totalAmount, validatedItems } = await validateAndGetEvents(items);
      await checkDuplicatePurchase(userId, items);
      
      const { orderId, orderNumber } = generateOrderId();
      const now = new Date();
      
      const newOrder = {
        id: orderId,
        orderNumber,
        userId,
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        paymentMethod: paymentMethod || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        createdAt: now,
        updatedAt: now
      };
      
      await tx.insert(orders).values(newOrder);
      const orderItemsCreated = await createOrderItemsBatch(tx, orderId, validatedItems);
      
      return {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        itemCount: validatedItems.length,
        orderItems: orderItemsCreated.map(item => stringifyBigInts(item))
      };
    });
    
    res.status(201).json({
      message: '訂單創建成功',
      order: result
    });
    
  } catch (err) {
    return handleError(err, res);
  }
};

const getOrder = async (req, res) => {
  try {
    const order = req.order;
    const allowedNextStates = STATE_TRANSITIONS[order.status] || [];
    
    res.json({ order: stringifyBigInts({ ...order, allowedNextStates }) });
  } catch (err) {
    return handleError(err, res);
  }
};

const getOrderWithDetails = async (req, res) => {
  try {
    const order = req.order;
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
    return handleError(err, res);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status: newStatus, paymentId } = req.body;
    const order = await findOrder(req.params.id);
    
    if (!validateStatusTransition(order.status, newStatus)) {
      return res.status(400).json({
        message: `無法從 ${order.status} 轉換到 ${newStatus}`,
        allowedTransitions: STATE_TRANSITIONS[order.status]
      });
    }
    
    await db.transaction(async (tx) => {
      const updateData = { status: newStatus, updatedAt: new Date() };
      
      if (newStatus === ORDER_STATUS.PAID) {
        if (!paymentId) {
          throw new Error('付款狀態需要提供 paymentId');
        }
        updateData.paymentId = paymentId;
        updateData.paidAt = new Date();
        
      } else if (newStatus === ORDER_STATUS.CONFIRMED) {
        // 確認訂單時自動加入參加記錄
        const orderItemsList = await getOrderItemsByOrderId(req.params.id);
        const participationData = orderItemsList.map(item => ({
          userId: order.userId,
          eventId: item.eventId,
          joinedAt: new Date(),
          updatedAt: new Date()
        }));
        
        if (participationData.length > 0) {
          await tx.insert(userEventParticipationTable).values(participationData);
        }
        
      } else if (newStatus === ORDER_STATUS.REFUNDED) {
        // 退款時移除參加記錄
        const orderItemsList = await getOrderItemsByOrderId(req.params.id);
        const eventIds = orderItemsList.map(item => item.eventId);
        
        await tx
          .delete(userEventParticipationTable)
          .where(and(
            eq(userEventParticipationTable.userId, order.userId),
            inArray(userEventParticipationTable.eventId, eventIds)
          ));
      }
      
      await tx.update(orders).set(updateData).where(eq(orders.id, req.params.id));
    });
    
    res.json({
      message: '訂單狀態已更新',
      orderId: req.params.id,
      previousStatus: order.status,
      newStatus
    });
    
  } catch (err) {
    return handleError(err, res);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    
    const order = await findOrder(req.params.id);
    
    if (order.userId !== userId) {
      return res.status(403).json({ message: '無權限取消此訂單' });
    }
    
    if (order.status !== ORDER_STATUS.PENDING) {
      return res.status(400).json({ message: '只能取消待付款訂單' });
    }
    
    const cancelledAt = new Date();
    await db.update(orders).set({
      status: ORDER_STATUS.CANCELLED,
      cancelledAt,
      cancellationReason: reason || '用戶主動取消',
      updatedAt: cancelledAt
    }).where(eq(orders.id, req.params.id));
    
    res.json({
      message: '訂單已取消',
      orderId: req.params.id,
      cancelledAt
    });
    
  } catch (err) {
    return handleError(err, res);
  }
};

module.exports = { 
  createOrder,
  getOrder,
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder,
  ORDER_STATUS
};