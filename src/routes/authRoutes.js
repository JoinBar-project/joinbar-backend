const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();

const { signup, login } = require("../controllers/authControllers.js");
const  validateSignup  = require("../middlewares/validateSignup.js");


/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 使用者註冊與登入
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 使用者註冊
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - nickname 
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: Bella
 *               nickname:
 *                 type: string
 *                 example: Bella
 *               email:
 *                 type: string
 *                 example: bella@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1995-01-01
 *
 *     responses:
 *       201:
 *         description: 註冊成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 註冊成功
 *                 user:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: Bella
 *                       email:
 *                         type: string
 *                         example: bella@example.com
 *                       role:
 *                         type: string
 *                         example: user
 *       400:
 *         description: 請求格式錯誤或欄位驗證失敗
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["username"]
 *                       message:
 *                         type: string
 *                         example: "姓名不可少於 2 個字元"
 *       409:
 *         description: 此信箱已被註冊
 */
router.post("/signup", validateSignup, signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 使用者登入
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: bella@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: 登入成功，回傳 access 與 refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 登入成功
 *                 accessToken:
 *                   type: string
 *                   example: ".................."
 *                 refreshToken:
 *                   type: string
 *                   example: ".................."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: Bella
 *                     email:
 *                       type: string
 *                       example: bella@example.com
 *                     role:
 *                       type: string
 *                       example: user
 *       401:
 *         description: 信箱或密碼錯誤
 */
router.post("/login", login);

module.exports = router;