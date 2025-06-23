const db = require('../config/db');
const { userCartTable, events } = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const dayjs = require('dayjs');

const getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🔍 查詢購物車，用戶ID:', userId);
    
    const cartRows = await db
      .select()
      .from(userCartTable)
      .where(eq(userCartTable.userId, userId));
    
    console.log('🔍 購物車原始數據:', cartRows);
    
    if (cartRows.length === 0) {
      return res.json({
        success: true,
        items: [],
        summary: { totalItems: 0, totalAmount: 0 }
      });
    }
    
    const eventIds = cartRows.map(row => row.eventId);
    const eventRows = await db
      .select()
      .from(events)
      .where(inArray(events.id, eventIds));
    
    console.log('🔍 活動數據:', eventRows);
    
    const cartItems = cartRows.map(cartItem => {
      const event = eventRows.find(e => String(e.id) === String(cartItem.eventId));
      
      if (!event) {
        console.warn('⚠️ 找不到活動:', cartItem.eventId);
        return null;
      }
      
      return {
        cartId: cartItem.id,
        quantity: cartItem.quantity,
        addedAt: cartItem.addedAt,
        
        id: String(event.id),
        eventId: String(event.id),
        name: event.name,
        price: event.price,
        imageUrl: event.imageUrl,
        barName: event.barName,
        startDate: event.startAt,
        endDate: event.endAt,
        status: event.status
      };
    }).filter(Boolean);
    
    console.log('🔍 組合後的購物車:', cartItems);
    
    res.json({
      success: true,
      items: cartItems,
      summary: {
        totalItems: cartItems.length,
        totalAmount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      }
    });
    
  } catch (error) {
    console.error('❌ 獲取購物車失敗:', error);
    res.status(500).json({ error: '獲取購物車失敗' });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: '缺少活動ID' });
    }
    
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.status, 1)))
      .limit(1);
    
    if (!event) {
      return res.status(404).json({ error: '活動不存在或已下架' });
    }
    
    if (event.endDate && dayjs(event.endDate).isBefore(dayjs())) {
      return res.status(400).json({ error: '活動已過期' });
    }
    
    const [existing] = await db
      .select()
      .from(userCartTable)
      .where(and(eq(userCartTable.userId, userId), eq(userCartTable.eventId, eventId)))
      .limit(1);
    
    if (existing) {
      return res.status(409).json({ error: '該活動已在購物車中' });
    }
    
    await db.insert(userCartTable).values({
      userId,
      eventId,
      quantity: 1
    });
    
    res.status(201).json({
      success: true,
      message: '已添加到購物車'
    });
    
  } catch (error) {
    console.error('添加到購物車失敗:', error);
    res.status(500).json({ error: '添加到購物車失敗' });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    
    await db
      .delete(userCartTable)
      .where(and(
        eq(userCartTable.userId, userId), 
        eq(userCartTable.eventId, eventId)
      ));
    
    res.json({
      success: true,
      message: '已從購物車移除'
    });
    
  } catch (error) {
    console.error('移除購物車項目失敗:', error);
    res.status(500).json({ error: '移除購物車項目失敗' });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await db
      .delete(userCartTable)
      .where(eq(userCartTable.userId, userId));
    
    res.json({
      success: true,
      message: '購物車已清空'
    });
    
  } catch (error) {
    console.error('清空購物車失敗:', error);
    res.status(500).json({ error: '清空購物車失敗' });
  }
};

module.exports = {
  getUserCart,
  addToCart,
  removeFromCart,
  clearCart
};