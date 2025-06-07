const db = require("../config/db");
const { usersTable } = require("../models/schema");
const { eq } = require("drizzle-orm");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  console.error(
    "Missing required environment variables: JWT_SECRET, REFRESH_SECRET"
  );
  process.exit(1); // 沒有環境變數則直接終止程式
}

const signup = async (req, res) => {
  const { username, nickname, email, password, birthday } = req.body;

  try {
    const userResult = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1); // 查到第一筆符合條件的資料就停止查詢

    if (userResult.length > 0) {
      return res.status(409).json({ error: "此信箱已被註冊" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(usersTable).values({
      username,
      nickname,
      email,
      password: hashedPassword,
      birthday: birthday ? new Date(birthday) : null,
      isVerifiedEmail: false,
      providerType: "email",
    }).returning({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role
    });

    return res.status(201).json({ message: "註冊成功", user: newUser });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [userResult] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!userResult) {
      return res.status(401).json({ error: "帳號或密碼有誤" });
    }
    // 比對密碼是否一樣
    const isMatch = await bcrypt.compare(password, userResult.password);

    if (!isMatch) {
      return res.status(401).json({ error: "帳號或密碼有誤" });
    }
    // 產生 token
    const accessToken = jwt.sign(
      {
        id: userResult.id,
        username: userResult.username,
        email: userResult.email,
        role: userResult.role,
        type: "access" // token 型別
      },
      JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );
    // 更新 token
    const refreshToken = jwt.sign(
      {
        id: userResult.id,
        type: "refresh", // token 型別
      },
      REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "登入成功",
      accessToken,
      refreshToken,
      user: {
        id: userResult.id,
        username: userResult.username,
        email: userResult.email,
        role: userResult.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login };
