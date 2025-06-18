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
 *               barName:
 *                 type: string
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
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 活動已建立
 *       400:
 *         description: 時間格式錯誤或缺少必要欄位
 *       500:
 *         description: 伺服器錯誤
 */
router.post('/create', authenticateToken, formatApiResponse, upload.single('image'), createEvent);

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
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功取得活動資訊
 *       404:
 *         description: 找不到活動
 *       500:
 *         description: 伺服器錯誤
 */

// getAllEvents 為優先讀取順序
// 避免 "all" 被當 id 導致錯誤（後續補 Swagger 文件）
router.get('/all', getAllEvents);
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
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               barName:
 *                 type: string
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
 *     summary: 軟刪除活動（含圖片刪除）
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 活動已刪除
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
