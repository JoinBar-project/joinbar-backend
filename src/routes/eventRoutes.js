const express = require('express');
const { createEvent, getEvent, updateEvent, softDeleteEvent, getAllEvents } = require('../controllers/eventControllers');
const { joinEvent } = require('../controllers/joinEventController');
const eventMessageRoutes = require('./eventMessageRoutes');
const authenticateToken = require('../middlewares/authenticateToken');
const formatApiResponse = require('../middlewares/formatApiResponse');
// const formatBigIntResponse = require('../middlewares/formatBigIntResponse')
// const withTaiwanTime = require('../middlewares/withTaiwanTime');


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
 *     summary: 建立新活動
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - barName
 *               - location
 *               - startDate
 *               - endDate
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
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-01T19:00:00
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-01T22:00:00
 *               maxPeople:
 *                 type: integer
 *                 example: 50
 *               imageUrl:
 *                 type: string
 *                 example: https://example.com/images/event.jpg
 *               price:
 *                 type: integer
 *                 example: 350
 *               hostUser:
 *                 type: integer
 *                 example: 1
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 3, 5]
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
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "729471928274819"
 *                     name:
 *                       type: string
 *                       example: 春酒 Party Night
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     location:
 *                       type: string
 *                     maxPeople:
 *                       type: integer
 *                     price:
 *                       type: integer
 *                     hostUser:
 *                       type: integer
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: 時間格式錯誤
 *       500:
 *         description: 伺服器錯誤
 */
router.post('/create', authenticateToken, formatApiResponse, createEvent);

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
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     location:
 *                       type: string
 *                     maxPeople:
 *                       type: integer
 *                     price:
 *                       type: integer
 *                     hostUser:
 *                       type: integer
 *                     imageUrl:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-12 21:21:42"
 *                     modifyAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-12 21:22:46"
 *                     status:
 *                       type: integer
 *                       example: 3
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
 *     summary: 更新活動
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
 *           example: 123456789012345
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - barName
 *               - location
 *               - startDate
 *               - endDate
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
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-01T19:00:00
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-01T22:00:00
 *               maxPeople:
 *                 type: integer
 *                 example: 50
 *               imageUrl:
 *                 type: string
 *                 example: https://example.com/images/event.jpg
 *               price:
 *                 type: integer
 *                 example: 350
 *               hostUser:
 *                 type: integer
 *                 example: 1
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 3, 5]
 *     responses:
 *       200:
 *         description: 活動已更新
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 活動已更新
 *                 update:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     barName:
 *                       type: string
 *                     location:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     maxPeople:
 *                       type: integer
 *                     imageUrl:
 *                       type: string
 *                     price:
 *                       type: integer
 *                     hostUser:
 *                       type: integer
 *                     modifyAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-07-01T19:00:00
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [1, 3, 5]
 *       404:
 *         description: 找不到活動
 *       500:
 *         description: 伺服器錯誤
 */
router.put('/update/:id', authenticateToken, formatApiResponse,  updateEvent);

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


//下面API等大家API都差不多後再補上API文件
router.get('/all', getAllEvents);
router.post('/:id/join', authenticateToken, joinEvent);
router.use('/:id/messages', eventMessageRoutes);

module.exports = router;