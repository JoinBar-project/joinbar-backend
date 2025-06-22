// src/routes/barRoutes.js
const express = require('express');
const router = express.Router();
const barController = require('../controllers/barController');
// const authMiddleware = require('../middlewares/auth'); // 如果需要身份驗證，可以在這裡引入並使用

// 獲取酒吧列表的路由
router.get('/bars', /* authMiddleware, */ barController.getBars); // 新增：定義 GET /api/bars 路由

module.exports = router;