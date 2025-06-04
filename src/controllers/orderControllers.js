const FlakeId = require('flake-idgen');
const intformat = require('biguint-format');
const db = require('../config/db');
const { orders, orderItems, events, userEventParticipationTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');

const flake = new FlakeId({ id: 1 });

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
  testConnection
};