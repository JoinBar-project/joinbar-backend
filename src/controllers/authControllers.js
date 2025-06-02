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

  if (!username || !email || !password) {
    return res.status(400).json({ error: "請填寫所有欄位" });
  }

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

    await db.insert(usersTable).values({
      username,
      nickname,
      email,
      password: hashedPassword,
      birthday: birthday ? new Date(birthday) : null,
      isVerifiedEmail: false,
      providerType: "email",
    });

    return res.status(201).json({ message: "註冊成功" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (users.length == 0) {
      return res.status(401).json({ error: "帳號或密碼有誤" });
    }
    // 比對密碼是否一樣
    const isMatch = await bcrypt.compare(password, users[0].password);

    if (!isMatch) {
      return res.status(401).json({ error: "帳號或密碼有誤" });
    }
    // 產生 token
    const accessToken = jwt.sign(
      {
        id: users[0].id,
        email: users[0].email,
      },
      JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );
    // 更新 token
    const refreshToken = jwt.sign(
      {
        id: users[0].id,
        username: users[0].username,
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
        id: users[0].id,
        username: users[0].username,
        email: users[0].email,
        role: users[0].role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login };
