const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

// ========== 訂單狀態定義 ==========
const ORDER_STATUS = {
  PENDING: 'pending',           // 待付款
  PAID: 'paid',                // 已付款
  CONFIRMED: 'confirmed',       // 已確認
  CANCELLED: 'cancelled',       // 已取消
  REFUNDED: 'refunded',         // 已退款
  EXPIRED: 'expired'            // 已過期
};

// 基本狀態轉換規則
const STATE_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CANCELLED]: [], // 終止狀態
  [ORDER_STATUS.REFUNDED]: [], // 終止狀態
  [ORDER_STATUS.EXPIRED]: []   // 終止狀態
};

// 狀態轉換驗證
function validateStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = STATE_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

// 輔助函數：處理 BigInt
function stringifyBigInts(obj) {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

// 創建訂單
const createOrder = async (req, res) => {
  try {
    console.log('=== 創建訂單（付款狀態管理版本）===');
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
        .where(and(eq(events.id, eventId), eq(events.status, 1)))
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
      
      totalAmount += event.price;
      validatedItems.push({
        eventId: eventId,
        eventName: event.name,
        price: event.price,
        quantity: 1
      });
    }
    
    // 重複購買檢查（來自修正的 Commit 5）
    console.log('檢查重複購買...');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const eventId = item.eventId.toString();
      
      console.log(`檢查重複購買 - 活動 ${i + 1}: ${eventId}`);
      
      // 檢查是否有該用戶的未付款訂單
      const existingPendingOrders = await db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber
        })
        .from(orders)
        .where(and(
          eq(orders.userId, parseInt(userId)),
          eq(orders.status, ORDER_STATUS.PENDING)
        ));
      
      if (existingPendingOrders.length > 0) {
        return res.status(400).json({ 
          message: `您有未付款的訂單，請先完成付款`,
          pendingOrderCount: existingPendingOrders.length,
          suggestedAction: '請查看您的訂單列表並完成付款'
        });
      }
      
      // 檢查是否已經參加過活動
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
    console.log(`✅ 所有 ${items.length} 個活動驗證通過`);
    console.log('總金額:', totalAmount);
    
    // 創建訂單基本資料
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
    
    console.log('準備插入訂單...');
    await db.insert(orders).values(newOrder);
    console.log('✅ 訂單插入成功');
    
    res.status(201).json({
      message: '訂單創建成功（含付款狀態管理）',
      order: {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toString(),
        status: ORDER_STATUS.PENDING,
        itemCount: validatedItems.length,
        items: validatedItems,
        allowedNextStates: STATE_TRANSITIONS[ORDER_STATUS.PENDING]
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
      order: stringifyBigInts({
        ...order,
        allowedNextStates: STATE_TRANSITIONS[order.status] || []
      })
    });
    
  } catch (err) {
    console.error('查詢訂單錯誤:', err);
    res.status(500).json({ 
      message: '查詢失敗', 
      error: err.message 
    });
  }
};

// 更新訂單狀態（專注付款功能）
const updateOrderStatus = async (req, res) => {
  try {
    console.log('=== 更新訂單狀態（付款功能版本）===');
    const orderId = req.params.id;
    const { status: newStatus, paymentId } = req.body;
    
    console.log(`訂單 ${orderId} 請求狀態變更為: ${newStatus}`);
    
    // 查詢當前訂單
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (!order) {
      return res.status(404).json({ message: '找不到訂單' });
    }
    
    console.log(`當前狀態: ${order.status} → 目標狀態: ${newStatus}`);
    
    // 狀態機驗證
    if (!validateStatusTransition(order.status, newStatus)) {
      return res.status(400).json({ 
        message: `無法從 ${order.status} 轉換到 ${newStatus}`,
        currentStatus: order.status,
        requestedStatus: newStatus,
        allowedTransitions: STATE_TRANSITIONS[order.status]
      });
    }
    
    console.log('✅ 狀態轉換驗證通過');
    
    // 基本更新資料
    const updateData = {
      status: newStatus,
      updatedAt: new Date()
    };
    
    // ========== 專注付款相關處理邏輯 ==========
    if (newStatus === ORDER_STATUS.PAID) {
      console.log('處理付款成功邏輯...');
      
      // 付款必須提供 paymentId
      if (!paymentId) {
        return res.status(400).json({ 
          message: '付款狀態更新需要提供 paymentId' 
        });
      }
      
      updateData.paymentId = paymentId;
      updateData.paidAt = new Date();
      
      console.log('✅ 付款處理完成（參加記錄將在後續版本實作）');
      
    } else if (newStatus === ORDER_STATUS.CONFIRMED) {
      console.log('處理訂單確認邏輯...');
      
      // 確認前必須是已付款狀態
      if (order.status !== ORDER_STATUS.PAID) {
        return res.status(400).json({ 
          message: '只有已付款訂單可以確認' 
        });
      }
      
      updateData.confirmedAt = new Date();
      console.log('✅ 訂單確認處理完成');
    }
    
    // 更新資料庫
    await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));
    
    console.log('✅ 資料庫更新成功');
    
    res.status(200).json({ 
      message: `訂單狀態已更新`,
      orderId: orderId,
      previousStatus: order.status,
      newStatus: newStatus,
      allowedNextStates: STATE_TRANSITIONS[newStatus],
      timestamp: new Date()
    });
    
  } catch (err) {
    console.error('更新訂單狀態錯誤:', err);
    res.status(500).json({ 
      message: '更新失敗', 
      error: err.message 
    });
  }
};

// 測試連線
const testConnection = async (req, res) => {
  try {
    console.log('=== 測試訂單 API 連線 ===');
    res.status(200).json({ 
      message: '訂單 API 連線成功！（付款狀態管理版本）',
      timestamp: new Date(),
      env: process.env.NODE_ENV || 'development',
      availableStatuses: Object.values(ORDER_STATUS),
      features: [
        '狀態機驗證',
        '重複購買檢查', 
        '活動驗證',
        '付款狀態管理',
        '狀態轉換驗證'
      ]
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
  updateOrderStatus,
  testConnection,
  ORDER_STATUS,
  validateStatusTransition
};