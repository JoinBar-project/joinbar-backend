const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, patchUserById, getDeletedUsers } = require('../controllers/usersControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const validateUpdateUserData = require('../middlewares/validateUpdateUserData');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 使用者管理 API
 */

// 所有路由都需驗證 Token
router.use(authenticateToken);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 取得所有使用者列表（限管理員）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       nickname:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       birthday:
 *                         type: string
 *                         format: date
 *                       avatarUrl:
 *                         type: string
 *       403:
 *         description: 無權限
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/', getAllUsers);

/**
 * @swagger
 * /api/users/deleted:
 *   get:
 *     summary: 取得所有已註銷使用者（限管理員）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得已註銷使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       nickname:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       birthday:
 *                         type: string
 *                         format: date
 *                       avatarUrl:
 *                         type: string
 *       403:
 *         description: 無權限
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/deleted', getDeletedUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 取得單一使用者資訊（本人或管理員）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 使用者 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功取得使用者資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     nickname:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     birthday:
 *                       type: string
 *                       format: date
 *                     avatarUrl:
 *                       type: string
 *       403:
 *         description: 無權限查看
 *       404:
 *         description: 查無此使用者
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: 更新使用者資料（本人或管理員）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 使用者 ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               nickname:
 *                 type: string
 *               birthday:
 *                 type: string
 *                 format: date
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 更新資料成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     nickname:
 *                       type: string
 *                     birthday:
 *                       type: string
 *                       format: date
 *                     avatarUrl:
 *                       type: string
 *                     email:
 *                       type: string
 *       403:
 *         description: 無權限修改
 *       500:
 *         description: 伺服器錯誤
 */
router.patch('/:id', validateUpdateUserData, patchUserById);

module.exports = router;
