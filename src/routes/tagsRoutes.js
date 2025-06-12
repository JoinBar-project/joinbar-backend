const express = require('express');
const { createTag, getListTag, getTag, deleteTag } = require('../controllers/eventTagControllers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: 活動標籤相關 API
 */

/**
 * @swagger
 * /api/tags/createTag:
 *   post:
 *     summary: 建立新標籤
 *     tags: [Tags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 調酒達人
 *     responses:
 *       201:
 *         description: 標籤建立成功
 */
router.post('/createTag', createTag);

/**
 * @swagger
 * /api/tags/list:
 *   get:
 *     summary: 取得所有標籤列表
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: 成功取得標籤列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 */
router.get('/list', getListTag);

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: 根據 ID 取得單一標籤
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 標籤 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功取得標籤
 */
router.get('/:id', getTag);

/**
 * @swagger
 * /api/tags/deleteTag/{id}:
 *   delete:
 *     summary: 刪除標籤
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 標籤 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 刪除成功
 */
router.delete('/deleteTag/:id', deleteTag);

module.exports = router;