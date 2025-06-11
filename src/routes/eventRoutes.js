const express = require('express');
const { createEvent, getEvent, updateEvent, softDeleteEvent } = require('../controllers/eventControllers');

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
 *     summary: 建立一個活動
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 活動建立成功
 */
router.post('/create', createEvent);

/**
 * @swagger
 * /api/event/{id}:
 *   get:
 *     summary: 取得單一活動資料
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 活動 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 取得成功
 */
router.get('/:id', getEvent);

/**
 * @swagger
 * /api/event/update/{id}:
 *   put:
 *     summary: 更新活動資料
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 活動 ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/update/:id', updateEvent);

/**
 * @swagger
 * /api/event/delete/{id}:
 *   delete:
 *     summary: 軟刪除活動
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 活動 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 刪除成功
 */
router.delete('/delete/:id', softDeleteEvent);

module.exports = router;