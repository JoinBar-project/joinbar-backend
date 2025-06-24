const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable, subTable } = require('../models/schema');
const { eq, and, inArray, count, desc, gt } = require('drizzle-orm');
const { checkUserExists } = require('../middlewares/checkPermission');
const { subPlans } = require('../utils/subPlans');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const flake = new FlakeId({ id: 2 });

const ITEM_TYPES = {
  EVENT: 1,
  SUBSCRIPTION: 2
};

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
    throw new Error('單次訂單最多10個商品');
  }
  
  for (const item of items) {
    if (!item.itemType || ![ITEM_TYPES.EVENT, ITEM_TYPES.SUBSCRIPTION].includes(item.itemType)) {
      throw new Error('商品類型無效');
    }
    
    if (item.itemType === ITEM_TYPES.EVENT && !item.eventId) {
      throw new Error('活動商品需要 eventId');
    }
    
    if (item.itemType === ITEM_TYPES.SUBSCRIPTION && !item.subscriptionType) {
      throw new Error('訂閱商品需要 subscriptionType');
    }
    
    if (item.quantity !== 1) {
      throw new Error('每個商品只能購買1個');
    }
  }
  
  return true;
};

const validateAndGetEventItems = async (eventItems) => {
  if (eventItems.length === 0) return { totalAmount: 0, validatedItems: [] };
  
  const now = dayjs().tz('Asia/Taipei').toDate();
  let totalAmount = 0;
  const validatedItems = [];
  const eventIds = eventItems.map(item => item.eventId.toString());
  
  const eventList = await db
    .select()
    .from(events)
    .where(and(inArray(events.id, eventIds), eq(events.status, 1)));
  
  const eventMap = eventList.reduce((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {});
  
  for (const item of eventItems) {
    const eventId = item.eventId.toString();
    const event = eventMap[eventId];
    
    if (!event) {
      throw new Error(`找不到活動 ID: ${eventId}`);
    }
    
    if (new Date(event.endAt) < now) {
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
      itemType: ITEM_TYPES.EVENT,
      eventId,
      subscriptionId: null,
      subscriptionType: null, 
      itemName: event.name,
      eventName: event.name,
      barName: event.barName,
      location: event.location,
      startAt: event.startAt,      
      endAt: event.endAt,          
      startDate: event.startAt,    
      endDate: event.endAt,       
      hostUserId: event.hostUser,
      price: event.price,
      quantity: 1
    });
  }
  
  return { totalAmount, validatedItems };
};

const validateAndGetSubscriptionItems = async (subscriptionItems) => {
  if (subscriptionItems.length === 0) return { totalAmount: 0, validatedItems: [] };
  
  let totalAmount = 0;
  const validatedItems = [];
  
  for (const item of subscriptionItems) {
    const { subscriptionType } = item;
    const plan = subPlans[subscriptionType];
    
    if (!plan) {
      throw new Error(`無效的訂閱方案: ${subscriptionType}`);
    }
    
    totalAmount += plan.price;
    validatedItems.push({
      itemType: ITEM_TYPES.SUBSCRIPTION,
      eventId: null,
      subscriptionId: null,
      subscriptionType: subscriptionType,
      itemName: plan.title,
      price: plan.price,
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
  
  const eventItems = items.filter(item => item.itemType === ITEM_TYPES.EVENT);
  if (eventItems.length > 0) {
    const eventIds = eventItems.map(item => item.eventId.toString());
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
  }
  
  const subscriptionItems = items.filter(item => item.itemType === ITEM_TYPES.SUBSCRIPTION);
  if (subscriptionItems.length > 0) {
    const now = dayjs().tz('Asia/Taipei').toDate();
    
    for (const item of subscriptionItems) {
      const subscriptionType = item.subscriptionType; 
      const existingSubs = await db
        .select()
        .from(subTable)
        .where(
          and(
            eq(subTable.userId, userId),
            eq(subTable.subType, subscriptionType),
            eq(subTable.status, 1),
            gt(subTable.endAt, now)
          )
        );
      
      if (existingSubs.length > 0) {
        throw new Error(`您已有相同類型的有效訂閱: ${subscriptionType}`);
      }
    }
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
    itemType: item.itemType,
    eventId: item.eventId,
    subscriptionId: item.subscriptionId,
    subscriptionType: item.subscriptionType, 
    price: item.price,
    eventName: item.eventName,
    barName: item.barName,
    location: item.location,
    eventStartDate: item.startAt || item.startDate,  
    eventEndDate: item.endAt || item.endDate,        
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
    .select({
      ...orderItems,
      eventName: events.name,
      eventPrice: events.price,
      barName: events.barName,
      eventStartDate: events.startAt,
      eventEndDate: events.endAt,
    })
    .from(orderItems)
    .leftJoin(events, eq(orderItems.eventId, events.id))
    .where(eq(orderItems.orderId, orderId));
  
  return items.map(item => {
    const result = stringifyBigInts(item);
    
    if (result.itemType === ITEM_TYPES.EVENT) {
      result.itemName = result.eventName;
    } else if (result.itemType === ITEM_TYPES.SUBSCRIPTION) {
      if (result.subscriptionType) {
        const plan = subPlans[result.subscriptionType];
        result.itemName = plan ? plan.title : '未知訂閱方案';
      } else {
        result.itemName = '訂閱方案'; 
      }
    }
    
    return result;
  });
};

const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, paymentMethod } = req.body; 
    
    const result = await db.transaction(async (tx) => {
      await validateOrderInput(userId, items);
      
      const eventItems = items.filter(item => item.itemType === ITEM_TYPES.EVENT);
      const subscriptionItems = items.filter(item => item.itemType === ITEM_TYPES.SUBSCRIPTION);
      
      const eventResult = await validateAndGetEventItems(eventItems);
      const subscriptionResult = await validateAndGetSubscriptionItems(subscriptionItems);
      
      const allValidatedItems = [...eventResult.validatedItems, ...subscriptionResult.validatedItems];
      const totalAmount = eventResult.totalAmount + subscriptionResult.totalAmount;
      
      await checkDuplicatePurchase(userId, allValidatedItems);
      
      const { orderId, orderNumber } = generateOrderId();
      const now = dayjs().tz('Asia/Taipei').toDate();
      
      const newOrder = {
        id: orderId,
        orderNumber,
        userId,
        totalAmount,
        status: ORDER_STATUS.PENDING,
        paymentMethod: paymentMethod || null,
        createdAt: now,
        updatedAt: now
      };
      
      await tx.insert(orders).values(newOrder);
      const orderItemsCreated = await createOrderItemsBatch(tx, orderId, allValidatedItems);
      
      return {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        itemCount: allValidatedItems.length,
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
        await processOrderCompletion(tx, req.params.id, order.userId);
        
      } else if (newStatus === ORDER_STATUS.REFUNDED) {
        await processOrderRefund(tx, req.params.id, order.userId);
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

const processOrderCompletion = async (tx, orderId, userId) => {
  const orderItemsList = await getOrderItemsByOrderId(orderId);
  const now = dayjs().tz('Asia/Taipei').toDate();
  
  const eventItems = orderItemsList.filter(item => item.itemType === ITEM_TYPES.EVENT);
  if (eventItems.length > 0) {
    const participationData = eventItems.map(item => ({
      userId,
      eventId: item.eventId,
      joinedAt: now,
      updatedAt: now
    }));
    
    await tx.insert(userEventParticipationTable).values(participationData);
  }
  
  const subscriptionItems = orderItemsList.filter(item => item.itemType === ITEM_TYPES.SUBSCRIPTION);
  if (subscriptionItems.length > 0) {
    for (const item of subscriptionItems) {
      if (item.subscriptionType) {
        const plan = subPlans[item.subscriptionType];
        if (plan) {
          const subId = intformat(flake.next(), 'dec');
          const startAt = now;
          const endAt = dayjs(now).add(plan.duration, 'day').toDate();
          
          await tx.insert(subTable).values({
            id: subId,
            userId,
            subType: item.subscriptionType,
            price: item.price,
            startAt,
            endAt,
            status: 1,
            createAt: now,
            modifyAt: now,
          });
          
          await tx.update(orderItems)
            .set({ subscriptionId: subId })
            .where(eq(orderItems.id, item.id));
        } else {
          console.error(`❌ 找不到訂閱方案: ${item.subscriptionType}`);
        }
      } else {
        console.error(`❌ 訂單項目缺少 subscriptionType: ${item.id}`);
      }
    }
  }
};

const processOrderRefund = async (tx, orderId, userId) => {
  const orderItemsList = await getOrderItemsByOrderId(orderId);
  
  const eventItems = orderItemsList.filter(item => item.itemType === ITEM_TYPES.EVENT);
  if (eventItems.length > 0) {
    const eventIds = eventItems.map(item => item.eventId);
    await tx
      .delete(userEventParticipationTable)
      .where(and(
        eq(userEventParticipationTable.userId, userId),
        inArray(userEventParticipationTable.eventId, eventIds)
      ));
  }
  
  const subscriptionItems = orderItemsList.filter(item => item.itemType === ITEM_TYPES.SUBSCRIPTION && item.subscriptionId);
  if (subscriptionItems.length > 0) {
    const subscriptionIds = subscriptionItems.map(item => item.subscriptionId);
    await tx
      .update(subTable)
      .set({ status: 2, modifyAt: dayjs().tz('Asia/Taipei').toDate() })
      .where(inArray(subTable.id, subscriptionIds));
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
        status: ORDER_STATUS.CONFIRMED, 
        paymentId,
        paidAt: now,
        updatedAt: now
      };
      
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
      
      await tx.update(orders).set(updateData).where(eq(orders.id, req.params.id));
      
      await processOrderCompletion(tx, req.params.id, order.userId);
    });
    
    res.json({
      message: '付款確認成功',
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      paymentId,
      status: ORDER_STATUS.CONFIRMED,
      timestamp: dayjs().tz('Asia/Taipei').toISOString()
    });
    
  } catch (err) {
    return handleError(err, res);
  }
};

const getUserOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📋 獲取用戶 ${userId} 的訂單歷史`);

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const ordersWithDetails = await Promise.all(
      userOrders.map(async (order) => {
        const orderItemsList = await getOrderItemsByOrderId(order.id);

        return {
          ...stringifyBigInts(order),
          items: orderItemsList
        };
      })
    );

    console.log(`✅ 找到 ${ordersWithDetails.length} 筆訂單`);

    res.json({
      success: true,
      orders: ordersWithDetails,
      total: ordersWithDetails.length,
      summary: {
        totalOrders: ordersWithDetails.length,
        pendingCount: ordersWithDetails.filter(order => order.status === 'pending').length,
        confirmedCount: ordersWithDetails.filter(order => order.status === 'confirmed').length,
        totalAmount: ordersWithDetails
          .filter(order => ['confirmed', 'paid'].includes(order.status))
          .reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0)
      }
    });

  } catch (error) {
    console.error('❌ 獲取訂單歷史失敗:', error);
    return handleError(error, res);
  }
};

module.exports = { 
  createOrder,
  getOrder,
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder,
  confirmPayment,
  getUserOrderHistory,
  ORDER_STATUS,
  ITEM_TYPES
};