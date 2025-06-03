const express = require('express');
const router = express.Router();
const { getLineAuthUrl, lineCallback, lineLogout } = require('../controllers/lineAuthController');
const { authenticateToken } = require('../middleware/authenticate');

// 取得 LINE 授權 URL (公開路由)
router.get('/url', getLineAuthUrl);

// LINE callback 處理 (公開路由)
router.get('/callback', lineCallback);

// 後續所有路由都需要認證
router.use(authenticateToken);

// LINE 登出 (需要認證)
router.post('/logout', lineLogout);

module.exports = router;