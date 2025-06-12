const express = require('express');
const router = express.Router();
const { getLineAuthUrl, lineCallback, lineLogout } = require('../controllers/lineAuthController');
const { authenticateToken } = require('../middlewares/authenticateToken');

/**
 * @swagger
 * tags:
 *   name: LINE Auth
 *   description: LINE 第三方登入 API
 */

/**
 * @swagger
 * /api/auth/line/url:
 *   get:
 *     summary: 取得 LINE 登入授權連結
 *     tags: [LINE Auth]
 *     responses:
 *       200:
 *         description: 回傳 LINE 授權 URL
 */
router.get('/url', getLineAuthUrl);

/**
 * @swagger
 * /api/auth/line/callback:
 *   get:
 *     summary: LINE 登入成功後的 callback
 *     tags: [LINE Auth]
 *     description: 接收 LINE 傳回的 code 與 state，進行登入與 token 發送。
 *     responses:
 *       200:
 *         description: 處理完成，導向登入狀態
 */
router.get('/callback', lineCallback);

/**
 * @swagger
 * /api/auth/line/logout:
 *   post:
 *     summary: 登出 LINE 登入狀態
 *     tags: [LINE Auth]
 *     responses:
 *       200:
 *         description: 使用者已成功登出
 */
router.post('/logout', lineLogout);

module.exports = router;