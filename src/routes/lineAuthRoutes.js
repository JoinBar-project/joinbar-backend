const express = require('express');
const router = express.Router();
const { getLineAuthUrl, lineCallback, lineLogout } = require('../controllers/lineAuthController');
const { authenticateToken } = require('../middlewares/authenticateToken');

// 取得 LINE 授權 URL (公開路由)
router.get('/url', getLineAuthUrl);

// LINE callback 處理 (公開路由)
router.get('/callback', lineCallback);

router.post('/logout', lineLogout);

module.exports = router;