const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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
 *               - startDate
 *               - endDate
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               barName:
 *                 type: string
 *               location:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               maxPeople:
 *                 type: integer
 *               price:
 *                 type: integer
 *               hostUser:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: 活動已建立
 *       400:
 *         description: 時間格式錯誤
 *       500:
 *         description: 伺服器錯誤
 */
router.post('/create', authenticateToken, upload.single('image'), createEvent);
router.get('/all', getAllEvents);
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
router.get('/:id', getEvent);

/**
 * @swagger
 * /api/event/{id}/update:
 *   put:
 *     summary: 更新活動資訊
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               barName:
 *                 type: string
 *               location:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               maxPeople:
 *                 type: integer
 *               price:
 *                 type: integer
 *               hostUser:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: 活動已更新
 *       404:
 *         description: 找不到活動
 *       500:
 *         description: 伺服器錯誤
 */
router.put('/update/:id', authenticateToken, upload.single('image'), updateEvent);

/**
 * @swagger
 * /api/event/{id}/delete:
 *   delete:
 *     summary: 軟刪除活動
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
 *         description: 找不到活動
 *       500:
 *         description: 伺服器錯誤
 */
router.delete('/delete/:id', authenticateToken, softDeleteEvent);

// 其他 API（後續可補 Swagger 文件）
router.post('/join/:id', authenticateToken, joinEvent);
router.use('/messages/:id', eventMessageRoutes);

module.exports = router;