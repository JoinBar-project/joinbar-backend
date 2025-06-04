const express = require('express');
const { 
  testConnection
} = require('../controllers/orderControllers');

const router = express.Router();

// 測試連線
router.get('/test', testConnection);

module.exports = router;