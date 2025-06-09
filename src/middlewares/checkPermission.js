const db = require('../config/db');
const { orders, usersTable } = require('../models/schema');
const { eq } = require('drizzle-orm');


const checkOrderOwnership = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (!order) {
      return res.status(404).json({ message: '找不到訂單' });
    }
    
    // 只有訂單擁有者或管理員能查看
    if (order.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: '無權限存取此訂單' });
    }
    
    req.order = order;
    next();
    
  } catch (err) {
    console.error('權限檢查失敗:', err);
    res.status(500).json({ message: '權限檢查失敗' });
  }
};


// 檢查管理員權限
const checkAdminRole = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理員權限' });
  }
  next();
};

// 檢查用戶是否存在
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