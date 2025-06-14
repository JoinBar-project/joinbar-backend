const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and, inArray, count } = require('drizzle-orm');
const { checkUserExists } = require('../middlewares/checkPermission');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const flake = new FlakeId({ id: 2 });

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

const stringifyBigInts = (obj) => JSON.parse(JSON.stringify(obj, (_, value) => 
  typeof value === 'bigint' ? value.toString() : value
));

const validateStatusTransition = (current, target) => {
  if (!current || typeof current !== 'string') {
    throw new Error('Invalid current status: must be a non-empty string');
  }
  if (!target || typeof target !== 'string') {
    throw new Error('Invalid target status: must be a non-empty string');
  }
  
  if (!(current in STATE_TRANSITIONS)) {
    throw new Error(`Invalid current status: ${current}`);
  }
  if (!Object.values(ORDER_STATUS).includes(target)) {
    throw new Error(`Invalid target status: ${target}`);
  }
  
  if ((STATE_TRANSITIONS[current] || []).includes(target)) {
    return true;
  } else {
    throw new Error(`Invalid status transition from ${current} to ${target}`);
  }
};

const generateOrderId = () => {
  const orderId = intformat(flake.next(), 'dec');
  const today = dayjs().tz('Asia/Taipei').format('YYYYMMDD');
  const orderNumber = `ORDER-${today}-${Date.now().toString().slice(-6)}`;
  return { orderId, orderNumber };
};

const handleError = (err, res) => {
  console.error('訂單錯誤:', err);
  
  const errorResponse = {
    error: true,
    timestamp: new Date().toISOString(),
    message: '',
    code: ''
  }

  if (err.message.includes('找不到')) {
    errorResponse.message = err.message
    errorResponse.code = 'NOT_FOUND'
    return res.status(404).json(errorResponse)
  }
  
  if (err.message.includes('無權限')) {
    errorResponse.message = err.message
    errorResponse.code = 'FORBIDDEN'
    return res.status(403).json(errorResponse)
  }
  
  if (err.message.includes('重複')) {
    errorResponse.message = err.message
    errorResponse.code = 'DUPLICATE'
    return res.status(409).json(errorResponse)
  }
  
  if (err.message.includes('已結束') || err.message.includes('狀態')) {
    errorResponse.message = err.message
    errorResponse.code = 'INVALID_STATE'
    return res.status(400).json(errorResponse)
  }
  
  errorResponse.message = '伺服器錯誤，請稍後再試'
  errorResponse.code = 'INTERNAL_ERROR'
  return res.status(500).json(errorResponse)
};

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

const validateAndGetEvents = async (items) => {
  const now = dayjs().tz('Asia/Taipei').toDate();
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

const checkDuplicatePurchase = async (userId, items) => {
  const existingPendingOrders = await db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, ORDER_STATUS.PENDING)));
  
  if (existingPendingOrders[0].count > 0) {
    throw new Error('您有未付款訂單，請先完成付款或取消');
  }
  
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
    price: item.price, 
    quantity: 1,
    subtotal: item.price 
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
    const { items, paymentMethod } = req.body; 
    
    const result = await db.transaction(async (tx) => {
      await validateOrderInput(userId, items);
      const { totalAmount, validatedItems } = await validateAndGetEvents(items);
      await checkDuplicatePurchase(userId, items);
      
      const { orderId, orderNumber } = generateOrderId();
      const now = dayjs().tz('Asia/Taipei').toDate();
      
      const newOrder = {
        id: orderId,
        orderNumber,
        userId,
        totalAmount: totalAmount, 
        status: ORDER_STATUS.PENDING,
        paymentMethod: paymentMethod || null,
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
    try {
      validateStatusTransition(order.status, newStatus);
    } catch (err) {
      return res.status(400).json({
        message: err.message,
        allowedTransitions: STATE_TRANSITIONS[order.status] || []
      });
    }
    
    await db.transaction(async (tx) => {
      const updateData = { status: newStatus, updatedAt: dayjs().tz('Asia/Taipei').toDate() };
      
      if (newStatus === ORDER_STATUS.PAID) {
        if (!paymentId) {
          throw new Error('付款狀態需要提供 paymentId');
        }
        updateData.paymentId = paymentId;
        updateData.paidAt = dayjs().tz('Asia/Taipei').toDate();
        
      } else if (newStatus === ORDER_STATUS.CONFIRMED) {
        const orderItemsList = await getOrderItemsByOrderId(req.params.id);
        const participationData = orderItemsList.map(item => ({
          userId: order.userId,
          eventId: item.eventId,
          joinedAt: dayjs().tz('Asia/Taipei').toDate(),
          updatedAt: dayjs().tz('Asia/Taipei').toDate()
        }));
        
        if (participationData.length > 0) {
          await tx.insert(userEventParticipationTable).values(participationData);
        }
        
      } else if (newStatus === ORDER_STATUS.REFUNDED) {
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
    
    const cancelledAt = dayjs().tz('Asia/Taipei').toDate();
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

const confirmPayment = async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;
    const order = await findOrder(req.params.id);
    
    if (order.userId !== req.user.id) {
      return res.status(403).json({ message: '無權限確認此訂單付款' });
    }
    
    if (order.status !== ORDER_STATUS.PENDING) {
      return res.status(400).json({ 
        message: '只能對待付款訂單進行付款確認',
        currentStatus: order.status,
        allowedStatuses: [ORDER_STATUS.PENDING]
      });
    }
    
    if (!paymentId) {
      return res.status(400).json({ message: '缺少付款 ID' });
    }
    
    await db.transaction(async (tx) => {
      const now = dayjs().tz('Asia/Taipei').toDate();
      const updateData = { 
        status: ORDER_STATUS.PAID,
        paymentId,
        paidAt: now,
        updatedAt: now
      };
      
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
      
      await tx.update(orders).set(updateData).where(eq(orders.id, req.params.id));
      
      const orderItemsList = await getOrderItemsByOrderId(req.params.id);
      const participationData = orderItemsList.map(item => ({
        userId: order.userId,
        eventId: item.eventId,
        joinedAt: now,
        updatedAt: now
      }));
      
      if (participationData.length > 0) {
        await tx.insert(userEventParticipationTable).values(participationData);
      }
    });
    
    res.json({
      message: '付款確認成功',
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      paymentId,
      status: ORDER_STATUS.PAID,
      timestamp: dayjs().tz('Asia/Taipei').toISOString()
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
  confirmPayment,
  ORDER_STATUS
};