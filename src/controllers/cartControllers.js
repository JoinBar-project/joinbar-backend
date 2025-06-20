const db = require('../config/db');
const { userCartTable, events } = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const dayjs = require('dayjs');

const getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cartItems = await db
      .select({
        cartId: userCartTable.id,
        cartQuantity: userCartTable.quantity,
        addedAt: userCartTable.addedAt,
        
        eventId: events.id,
        eventName: events.name,
        eventPrice: events.price,
        eventImageUrl: events.imageUrl,
        barName: events.barName,
        eventStartDate: events.startDate,
        eventEndDate: events.endDate,
        eventStatus: events.status,
      })
      .from(userCartTable)
      .innerJoin(events, eq(userCartTable.eventId, events.id))
      .where(eq(userCartTable.userId, userId))
      .orderBy(userCartTable.addedAt);
    
    const validItems = cartItems.filter(item => {
      const isActive = item.eventStatus === 1;
      const notExpired = !item.eventEndDate || dayjs(item.eventEndDate).isAfter(dayjs());
      return isActive && notExpired;
    });
    
    const formattedItems = validItems.map(item => ({
      id: item.cartId,
      eventId: item.eventId,
      name: item.eventName,
      price: item.eventPrice,
      imageUrl: item.eventImageUrl,
      barName: item.barName,
      startDate: item.eventStartDate,
      endDate: item.eventEndDate,
      quantity: item.cartQuantity,
      addedAt: item.addedAt
    }));
    
    res.json({
      success: true,
      items: formattedItems,
      summary: {
        totalItems: formattedItems.length,
        totalAmount: formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      }
    });
    
  } catch (error) {
    console.error('獲取購物車失敗:', error);
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
    
    const result = await db
      .delete(userCartTable)
      .where(and(eq(userCartTable.userId, userId), eq(userCartTable.eventId, eventId)));
    
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