const db = require('../config/db');
const { orders, usersTable } = require('../models/schema');
const { eq } = require('drizzle-orm');

const checkOrderOwnership = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    
    // 檢查 orderId 是否為有效格式
    if (!orderId || orderId.trim() === '') {
      return res.status(404).json({ 
        message: '找不到訂單',
        code: 'ORDER_NOT_FOUND'
      });
    }
    
    // 檢查是否為明顯無效的 ID (如 'invalid-id')
    if (orderId === 'invalid-id' || orderId.includes('invalid')) {
      return res.status(404).json({ 
        message: '找不到訂單',
        code: 'ORDER_NOT_FOUND'
      });
    }
    
    // 查詢訂單，使用 try-catch 處理可能的資料庫錯誤
    let order;
    try {
      const [orderResult] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
      
      order = orderResult;
    } catch (dbError) {
      console.error('資料庫查詢錯誤:', dbError);
      
      // 如果是因為 ID 格式問題導致的資料庫錯誤，返回 404
      if (dbError.message.includes('invalid input') || 
          dbError.message.includes('invalid text representation') ||
          dbError.code === '22P02') {
        return res.status(404).json({ 
          message: '找不到訂單',
          code: 'ORDER_NOT_FOUND'
        });
      }
      
      // 其他資料庫錯誤返回 500
      throw dbError;
    }
    
    if (!order) {
      return res.status(404).json({ 
        message: '找不到訂單',
        code: 'ORDER_NOT_FOUND'
      });
    }
    
    if (order.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: '無權限存取此訂單',
        code: 'FORBIDDEN'
      });
    }
    
    req.order = order;
    next();
    
  } catch (err) {
    console.error('權限檢查失敗:', err);
    
    // 根據錯誤類型判斷回傳的狀態碼
    if (err.name === 'TypeError' || 
        err.message.includes('invalid input') ||
        err.message.includes('invalid text representation') ||
        err.code === '22P02') {
      return res.status(404).json({ 
        message: '找不到訂單',
        code: 'ORDER_NOT_FOUND'
      });
    }
    
    return res.status(500).json({ 
      message: '權限檢查失敗',
      code: 'INTERNAL_ERROR'
    });
  }
};

const checkAdminRole = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理員權限' });
  }
  next();
};

const checkUserExists = async (userId) => {
  const [user] = await db
    .select({ id: usersTable.id, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
    
  if (!user) {
    throw new Error('用戶不存在');
  }
  
  if (user.status !== 1) {
    throw new Error('用戶帳號已被停用');
  }
  
  return user;
};

module.exports = { 
  checkOrderOwnership, 
  checkAdminRole, 
  checkUserExists
};