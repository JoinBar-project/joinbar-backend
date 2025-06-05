const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

const createOrder = async (req, res) => {
  try {
    console.log('=== 創建訂單（基礎版本）===');
    console.log('請求資料:', req.body);
    
    const { 
      userId, 
      items, 
      paymentMethod, 
      customerName, 
      customerPhone, 
      customerEmail 
    } = req.body;
    
    // 基本驗證
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: '缺少必要資料：userId 和 items 是必填的' 
      });
    }
    
    // 生成訂單 ID 和編號
    const orderId = intformat(flake.next(), 'dec');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORDER-${today}-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    
    console.log('生成的訂單ID:', orderId);
    console.log('訂單編號:', orderNumber);
    
    // 創建訂單基本資料
    const newOrder = {
      id: orderId,
      orderNumber,
      userId: parseInt(userId),
      totalAmount: "0", // 暫時設為 0，後續會計算
      status: 'pending',
      paymentMethod: paymentMethod || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      createdAt: now,
      updatedAt: now
    };
    
    console.log('準備插入訂單:', newOrder);
    
    // 插入訂單
    await db.insert(orders).values(newOrder);
    console.log('✅ 訂單插入成功');
    
    res.status(201).json({
      message: '訂單創建成功（基礎版本）',
      order: {
        orderId,
        orderNumber,
        status: 'pending',
        itemCount: items.length
      }
    });
    
  } catch (err) {
    console.error('創建訂單錯誤:', err);
    res.status(500).json({ 
      message: '創建訂單失敗', 
      error: err.message 
    });
  }
};

// 測試連線
const testConnection = async (req, res) => {
  try {
    console.log('=== 測試訂單 API 連線 ===');
    res.status(200).json({ 
      message: '訂單 API 連線成功！',
      timestamp: new Date(),
      env: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('連線測試錯誤:', err);
    res.status(500).json({ 
      message: '連線失敗', 
      error: err.message 
    });
  }
};

module.exports = { 
  createOrder,
  testConnection
};