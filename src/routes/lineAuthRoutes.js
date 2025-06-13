const express = require('express');
const router = express.Router();
const { getLineAuthUrl, lineCallback, lineLogout } = require('../controllers/lineAuthController');
const { authenticateToken } = require('../middlewares/authenticateToken');

/**
 * @swagger
 * tags:
 *   - name: LINE Auth
 *     description: LINE 第三方登入 API
 */

/**
 * @swagger
 * /api/auth/line/url:
 *   get:
 *     summary: 產生 LINE 登入授權連結
 *     tags: [LINE Auth]
 *     responses:
 *       200:
 *         description: 回傳 LINE 授權連結與 CSRF 保護用 state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   example: https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=123456...
 *                 state:
 *                   type: string
 *                   example: 123abc456def789ghi
 *       503:
 *         description: LINE 登入服務暫時無法使用
 *       500:
 *         description: 發生伺服器錯誤
 */
router.get('/url', getLineAuthUrl);

/**
 * @swagger
 * /api/auth/line/callback:
 *   get:
 *     summary: LINE 登入授權回調（處理授權碼）
 *     tags: [LINE Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         description: LINE 回傳的一次性授權碼
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         description: 預防 CSRF 的驗證字串
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: 重導向回前端登入成功頁面（已設置 cookies）
 *       400:
 *         description: 授權失敗或資料錯誤
 *       500:
 *         description: 處理過程發生錯誤
 */
router.get('/callback', lineCallback);

/**
 * @swagger
 * /api/auth/line/logout:
 *   post:
 *     summary: 登出 LINE 用戶（清除登入相關 cookies）
 *     tags: [LINE Auth]
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: LINE 登出成功
 */
router.post('/logout', lineLogout);

module.exports = router;