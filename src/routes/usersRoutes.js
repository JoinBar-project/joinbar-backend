const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, patchUserById } = require('../controllers/usersControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const validateUpdateUserData = require('../middlewares/validateUpdateUserData');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 會員 API
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 取得所有使用者
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
router.get('/', authenticateToken, getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 根據 ID 取得使用者資料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 使用者 ID
 *     responses:
 *       200:
 *         description: 成功取得單一使用者資料
 */
router.get('/:id', authenticateToken, getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: 更新使用者資料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 使用者 ID
 *     requestBody:
 *       description: 欲更新的使用者欄位
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/:id', authenticateToken, validateUpdateUserData, patchUserById);

module.exports = router;