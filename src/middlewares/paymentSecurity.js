const db = require('../config/db');
const { orders, usersTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const dayjs = require('dayjs');

const requestTracker = new Map();

const cleanupTracker = () => {
  const now = dayjs().valueOf();
  const expireTime = 15 * 60 * 1000;
  for (const [key, data] of requestTracker.entries()) {
    if (now - data.timestamp > expireTime) {
      requestTracker.delete(key);
    }
  }
};

const simpleRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const key = `payment_${userId}`;
    const now = dayjs().valueOf();

    if (Math.random() < 0.1) {
      cleanupTracker();
    }

    const userRequests = requestTracker.get(key) || [];
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (recentRequests.length >= maxAttempts) {
      return res.status(429).json({
        error: '付款請求過於頻繁，請稍後再試',
        code: 'PAYMENT_RATE_LIMIT',
        retryAfter: Math.ceil(windowMs / 1000 / 60)
      });
    }

    recentRequests.push(now);
    requestTracker.set(key, recentRequests);

    next();
  };
};

const validatePaymentData = (req, res, next) => {
  const { orderId, amount, currency = 'TWD' } = req.body;

  if (!orderId) {
    return res.status(400).json({
      error: '缺少訂單 ID',
      code: 'MISSING_ORDER_ID'
    });
  }

  if (amount !== undefined) {
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({
        error: '金額必須是正整數',
        code: 'INVALID_AMOUNT'
      });
    }

    const maxAmount = parseInt(process.env.MAX_PAYMENT_AMOUNT) || 100000;
    if (amount > maxAmount) {
      return res.status(400).json({
        error: `金額超過上限 $${maxAmount.toLocaleString()}`,
        code: 'AMOUNT_TOO_HIGH'
      });
    }
  }

  if (currency !== 'TWD') {
    return res.status(400).json({
      error: '僅支援台幣交易',
      code: 'UNSUPPORTED_CURRENCY'
    });
  }

  next();
};

const preventDuplicatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    const [user] = await db
      .select({ id: usersTable.id, status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user || user.status !== 1) {
      return res.status(403).json({
        error: '用戶狀態異常',
        code: 'USER_INACTIVE'
      });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    if (!order) {
      return res.status(404).json({
        error: '找不到訂單或無權限',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.status !== 'pending') {
      let message = '';
      switch (order.status) {
        case 'paid':
        case 'confirmed':
          message = '訂單已付款';
          break;
        case 'cancelled':
          message = '訂單已取消';
          break;
        case 'refunded':
          message = '訂單已退款';
          break;
        case 'expired':
          message = '訂單已過期';
          break;
        default:
          message = '訂單狀態異常';
      }

      return res.status(400).json({
        error: message,
        code: 'INVALID_ORDER_STATUS',
        currentStatus: order.status
      });
    }

    if (req.body.amount && req.body.amount !== order.totalAmount) {
      return res.status(400).json({
        error: '付款金額與訂單不符',
        code: 'AMOUNT_MISMATCH',
        orderAmount: order.totalAmount,
        requestAmount: req.body.amount
      });
    }

    if (order.paymentId && order.paymentMethod) {
      console.log(`用戶 ${userId} 重新嘗試付款，訂單 ${orderId}，已有交易 ${order.paymentId}`);
    }

    req.order = order;
    req.orderUser = user;

    next();
  } catch (error) {
    console.error('防重複付款檢查失敗:', error);
    return res.status(500).json({
      error: '付款驗證失敗',
      code: 'VALIDATION_ERROR'
    });
  }
};

const checkPaymentAccess = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

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

    if (order.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        error: '無權限查看此訂單',
        code: 'ACCESS_DENIED'
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error('付款權限檢查失敗:', error);
    return res.status(500).json({
      error: '權限檢查失敗',
      code: 'ACCESS_CHECK_ERROR'
    });
  }
};

const logPaymentRequests = (req, res, next) => {
  const timestamp = dayjs().toISOString();
  const logData = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    orderId: req.body?.orderId || req.params?.orderId
  };

  console.log('💳 付款請求記錄:', JSON.stringify(logData));

  const originalJson = res.json;
  res.json = function(data) {
    console.log('💳 付款回應記錄:', {
      ...logData,
      statusCode: res.statusCode,
      success: res.statusCode < 400
    });
    return originalJson.call(this, data);
  };

  next();
};

const checkBasicSecurity = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress;

  if (clientIP && clientIP.includes('127.0.0.1') && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ 可疑的本地 IP 在生產環境:', clientIP);
  }

  next();
};

module.exports = {
  paymentRateLimit: simpleRateLimit(5, 15 * 60 * 1000),
  validatePaymentData,
  preventDuplicatePayment,
  checkPaymentAccess,
  logPaymentRequests,
  checkBasicSecurity,
  simpleRateLimit
};
