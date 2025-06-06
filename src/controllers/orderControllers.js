const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

// 輔助函數：處理 BigInt
function stringifyBigInts(obj) {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

// 創建訂單 - 加入活動驗證和數量限制
const createOrder = async (req, res) => {
  try {
    console.log('=== 創建訂單（活動驗證版本）===');
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
    
    // 驗證每個 item 的格式和數量限制
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.eventId || !item.quantity) {
        return res.status(400).json({ 
          message: `第 ${i + 1} 個商品缺少 eventId 或 quantity` 
        });
      }
      
      // 數量限制檢查
      if (item.quantity !== 1) {
        return res.status(400).json({ 
          message: `第 ${i + 1} 個商品數量錯誤：每個活動只能購買 1 張票` 
        });
      }
    }
    
    // 生成訂單 ID 和編號
    const orderId = intformat(flake.next(), 'dec');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORDER-${today}-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    
    console.log('生成的訂單ID:', orderId);
    console.log('訂單編號:', orderNumber);
    
    // 驗證所有活動並計算總金額
    console.log('開始驗證活動...');
    let totalAmount = 0;
    const orderItemsData = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const eventId = item.eventId.toString();
      
      console.log(`驗證活動 ${i + 1}: ${eventId}`);
      
      // 查詢活動是否存在
      const [event] = await db
        .select()
        .from(events)
        .where(and(eq(events.id, eventId), eq(events.status, 1))) // 只查詢正常狀態的活動
        .limit(1);
      
      if (!event) {
        return res.status(404).json({ 
          message: `找不到活動 ID: ${eventId} 或活動已被刪除` 
        });
      }
      
      // 檢查活動是否已結束
      if (new Date(event.endDate) < now) {
        return res.status(400).json({ 
          message: `活動「${event.name}」已結束，無法購買` 
        });
      }
      
      console.log(`✅ 活動「${event.name}」驗證通過`);
      
      // 累計總金額
      totalAmount += event.price;
      
      // 準備訂單項目資料
      const itemId = intformat(flake.next(), 'dec');
      orderItemsData.push({
        id: itemId,
        orderId: orderId,
        eventId: eventId,
        eventName: event.name,
        barName: event.barName,
        location: event.location,
        eventStartDate: event.startDate,
        eventEndDate: event.endDate,
        hostUserId: event.hostUser,
        price: event.price.toString(),
        quantity: 1,
        subtotal: event.price.toString()
      });
    }
    
    console.log(`✅ 所有 ${items.length} 個活動驗證通過`);
    console.log('總金額:', totalAmount);
    
    // 創建訂單基本資料
    const newOrder = {
      id: orderId,
      orderNumber,
      userId: parseInt(userId),
      totalAmount: totalAmount.toString(),
      status: 'pending',
      paymentMethod: paymentMethod || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      createdAt: now,
      updatedAt: now
    };
    
    console.log('準備插入訂單...');
    await db.insert(orders).values(newOrder);
    console.log('✅ 訂單插入成功');
    
    // 批量插入訂單項目
    if (orderItemsData.length > 0) {
      await db.insert(orderItems).values(orderItemsData);
      console.log(`✅ ${orderItemsData.length} 個訂單項目插入成功`);
    }
    
    res.status(201).json({
      message: '訂單創建成功',
      order: {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: 'pending',
        itemCount: orderItemsData.length,
        items: orderItemsData.map(item => ({
          eventId: item.eventId,
          eventName: item.eventName,
          price: item.price,
          quantity: item.quantity
        }))
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

// 查詢訂單詳細資料
const getOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log('=== 查詢訂單詳細資料 ===');
    console.log('訂單ID:', orderId);
    
    // 查詢訂單基本資料
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (!order) {
      return res.status(404).json({ 
        message: '找不到訂單' 
      });
    }
    
    console.log('找到訂單:', order.orderNumber);
    
    // 查詢訂單項目
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    
    console.log('找到訂單項目數量:', items.length);
    
    // 組合完整訂單資料
    const orderData = {
      ...order,
      items
    };
    
    // 處理 BigInt 並回傳
    res.status(200).json({
      message: '查詢成功',
      order: stringifyBigInts(orderData)
    });
    
  } catch (err) {
    console.error('查詢訂單錯誤:', err);
    res.status(500).json({ 
      message: '查詢訂單失敗', 
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
  getOrder,
  testConnection
};