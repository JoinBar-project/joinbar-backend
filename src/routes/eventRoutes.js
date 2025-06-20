const express = require('express');
const upload = require('../middlewares/imageUpload');
const {
  createEvent,
  getEvent,
  updateEvent,
  softDeleteEvent,
  getAllEvents
} = require('../controllers/eventControllers');

const { joinEvent } = require('../controllers/joinEventController');
const eventMessageRoutes = require('./eventMessageRoutes');
const authenticateToken = require('../middlewares/authenticateToken');
const formatApiResponse = require('../middlewares/formatApiResponse');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: 活動 API
 */

/**
 * @swagger
 * /api/event/create:
 *   post:
 *     summary: 建立新活動（含圖片上傳）
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - barName
 *               - location
 *               - startAt
 *               - endAt
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 example: 春酒 Party Night
 *               barName:
 *                 type: string
 *                 example: 台北信義 BAR88
 *               location:
 *                 type: string
 *                 example: 台北市信義區松仁路88號
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-01T19:00:00
 *               endAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-01T22:00:00
 *               maxPeople:
 *                 type: integer
 *                 example: 50
 *               price:
 *                 type: integer
 *                 example: 350
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 3, 5]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 活動已建立
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 活動已建立
 *                 event:
 *                   type: object
 *       400:
 *         description: 時間格式錯誤或缺少必要欄位
 *       500:
 *         description: 伺服器錯誤
 */
router.post('/create', authenticateToken, formatApiResponse, upload.single('image'), createEvent);

/**
 * @swagger
 * /api/event/all:
 *   get:
 *     summary: 取得所有活動列表
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: 成功取得所有活動
 *       500:
 *         description: 伺服器錯誤
 */

// getAllEvents 為優先讀取順序
// 避免 "all" 被當 id 導致錯誤（後續補 Swagger 文件）
router.get('/all', formatApiResponse, getAllEvents);

/**
 * @swagger
 * /api/event/{id}:
 *   get:
 *     summary: 查詢單一活動
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 活動 ID
 *         schema:
 *           type: string
 *           example: "729471928274819"
 *     responses:
 *       200:
 *         description: 成功取得活動資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: object
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       404:
 *         description: 找不到活動
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/:id', formatApiResponse, getEvent);

/**
 * @swagger
 * /api/event/update/{id}:
 *   put:
 *     summary: 更新活動（可更新圖片）
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 活動 ID
 *         schema:
 *           type: string
 *           example: "123456789012345"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 春酒 Party Night
 *               barName:
 *                 type: string
 *                 example: 台北信義 BAR88
 *               location:
 *                 type: string
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *               maxPeople:
 *                 type: integer
 *               price:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 3, 5]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 活動已更新
 *       404:
 *         description: 找不到活動
 *       500:
 *         description: 伺服器錯誤
 */
router.put('/update/:id', authenticateToken, formatApiResponse, upload.single('image'), updateEvent);

/**
 * @swagger
 * /api/event/delete/{id}:
 *   delete:
 *     summary: 軟刪除活動（status 設為 2）
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 活動 ID
 *         schema:
 *           type: string
 *           example: "729471928274819"
 *     responses:
 *       200:
 *         description: 活動已刪除
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 活動已刪除
 *       404:
 *         description: 找不到活動或已刪除
 *       500:
 *         description: 伺服器錯誤
 */
router.delete('/delete/:id', authenticateToken, formatApiResponse, softDeleteEvent);

// 其他 API（後續補 Swagger 文件）
router.post('/:id/join', authenticateToken, joinEvent);
router.use('/:id/messages', eventMessageRoutes);

module.exports = router;
