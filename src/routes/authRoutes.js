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
 *               - email
 *               - password
 *               - nickname
 *             properties:
 *               email:
 *                 type: string
 *                 example: bella@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               nickname:
 *                 type: string
 *                 example: Bella
 *     responses:
 *       201:
 *         description: 註冊成功
 *       400:
 *         description: 資料格式錯誤或帳號已存在
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
 *                 example: password123
 *     responses:
 *       200:
 *         description: 登入成功，回傳 JWT token
 *       401:
 *         description: 信箱或密碼錯誤
 */
router.post("/login", login);

module.exports = router;