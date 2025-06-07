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

// 創建訂單 - 修正重複購買檢查
const createOrder = async (req, res) => {
  try {
    console.log('=== 創建訂單（修正重複購買檢查版本）===');
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
    const validatedItems = [];
    
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
      
      // 儲存驗證過的活動資料
      validatedItems.push({
        eventId: eventId,
        eventName: event.name,
        price: event.price,
        quantity: 1
      });
    }
    
    // ========== 修正：重複購買檢查 ==========
    console.log('檢查重複購買...');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const eventId = item.eventId.toString();
      
      console.log(`檢查重複購買 - 活動 ${i + 1}: ${eventId}`);
      
      // ✅ 修正：簡化檢查，只查詢 orders 表
      // 檢查是否有該用戶針對該活動的未付款訂單
      const existingPendingOrders = await db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber
        })
        .from(orders)
        .where(and(
          eq(orders.userId, parseInt(userId)),
          eq(orders.status, 'pending')
        ));
      
      if (existingPendingOrders.length > 0) {
        // 如果有未付款訂單，提醒用戶先完成付款
        // 注意：這裡簡化處理，不檢查具體活動
        // 完整的檢查會在 Commit 8 實作 orderItems 後進行
        console.log(`⚠️ 用戶有 ${existingPendingOrders.length} 個未付款訂單`);
        
        return res.status(400).json({ 
          message: `您有未付款的訂單，請先完成付款再建立新訂單`,
          pendingOrderCount: existingPendingOrders.length,
          suggestedAction: '請查看您的訂單列表並完成付款'
        });
      }
      
      // ✅ 檢查是否已經參加過活動（這個檢查是正確的）
      const existingParticipation = await db
        .select()
        .from(userEventParticipationTable)
        .where(and(
          eq(userEventParticipationTable.userId, parseInt(userId)),
          eq(userEventParticipationTable.eventId, eventId)
        ))
        .limit(1);
      
      if (existingParticipation.length > 0) {
        const eventName = validatedItems.find(v => v.eventId === eventId)?.eventName || eventId;
        return res.status(400).json({ 
          message: `您已經參加過活動「${eventName}」，無法重複購票`,
          conflictEventId: eventId
        });
      }
      
      console.log(`✅ 活動 ${eventId} 重複購買檢查通過`);
    }
    
    console.log('✅ 所有活動重複購買檢查通過');
    // ========== 重複購買檢查結束 ==========
    
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
    
    res.status(201).json({
      message: '訂單創建成功（含重複購買檢查）',
      order: {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: 'pending',
        itemCount: validatedItems.length,
        items: validatedItems
      },
      note: '完整的活動級重複檢查將在 orderItems 實作後加入'
    });
    
  } catch (err) {
    console.error('創建訂單錯誤:', err);
    res.status(500).json({ 
      message: '創建訂單失敗', 
      error: err.message 
    });
  }
};

// 查詢訂單
const getOrder = async (req, res) => {
  try {
    console.log('=== 查詢訂單 ===');
    const orderId = req.params.id;
    console.log('查詢訂單ID:', orderId);
    
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (!order) {
      return res.status(404).json({ message: '找不到訂單' });
    }
    
    console.log('✅ 訂單查詢成功');
    res.status(200).json({
      order: stringifyBigInts(order)
    });
    
  } catch (err) {
    console.error('查詢訂單錯誤:', err);
    res.status(500).json({ 
      message: '查詢失敗', 
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