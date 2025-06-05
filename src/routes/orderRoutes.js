const express = require('express');
const { 
  createOrder,
  testConnection
} = require('../controllers/orderControllers');

const router = express.Router();

// 測試連線
router.get('/test', testConnection);

// 創建訂單（基礎版本）
router.post('/create', createOrder);

module.exports = router;