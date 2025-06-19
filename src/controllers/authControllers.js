const db = require("../config/db");
const { usersTable } = require("../models/schema");
const { eq } = require("drizzle-orm");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');
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
      .limit(1);

    if (userResult.length > 0) {
      return res.status(409).json({ error: "此信箱已被註冊" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小時後過期

    const [newUser] = await db.insert(usersTable).values({
      username,
      nickname,
      email,
      password: hashedPassword,
      birthday: birthday ? new Date(birthday) : null,
      isVerifiedEmail: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      lastVerificationEmailSent: now,
      providerType: "email",
    }).returning({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role
    });

    const emailResult = await sendVerificationEmail(email, verificationToken, username);

    if (!emailResult.success) {
      console.error('寄送驗證信失敗，但用戶已建立');
    }

    return res.status(201).json({ 
      message: "註冊成功！請檢查您的信箱並點擊驗證連結來啟用帳號",
      user: newUser,
      emailSent: emailResult.success
    });
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

    const isMatch = await bcrypt.compare(password, userResult.password);

    if (!isMatch) {
      return res.status(401).json({ error: "帳號或密碼有誤" });
    }

    // 檢查信箱是否已驗證
    if (!userResult.isVerifiedEmail) {
      return res.status(403).json({ 
        error: "請先驗證您的信箱才能登入",
        needVerification: true 
      });
    }

    // 產生 token
    const accessToken = jwt.sign(
      {
        id: userResult.id,
        username: userResult.username,
        email: userResult.email,
        role: userResult.role,
        type: "access"
      },
      JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    const refreshToken = jwt.sign(
      {
        id: userResult.id,
        type: "refresh",
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
        isVerifiedEmail: userResult.isVerifiedEmail,
        avatarUrl: userResult.avatarUrl
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "缺少驗證 token" });
  }

  try {
    // 查找有效的驗證 token
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.emailVerificationToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: "無效的驗證連結" });
    }

    // 檢查 token 是否過期
    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ error: "驗證連結已過期，請重新註冊" });
    }

    // 檢查是否已經驗證過
    if (user.isVerifiedEmail) {
      return res.status(200).json({ message: "信箱已經驗證過了" });
    }

    // 更新用戶狀態
    await db
      .update(usersTable)
      .set({
        isVerifiedEmail: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        lastVerificationEmailSent: null,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, user.id));

    return res.status(200).json({ 
      message: "信箱驗證成功！您現在可以正常使用所有功能了" 
    });

  } catch (err) {
    console.error('驗證信箱過程發生錯誤:', err);
    return res.status(500).json({ error: "驗證失敗，請稍後再試" });
  }
};

const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "請提供信箱地址" });
  }

  try {
    // 查找用戶
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return res.status(200).json({ 
        message: "如果該信箱已註冊，您將收到新的驗證信" 
      });
    }

    // 如果已經驗證過了
    if (user.isVerifiedEmail) {
      return res.status(400).json({ 
        error: "此信箱已經驗證完成，您可以直接登入" 
      });
    }

    // 冷卻時間
    if (user.lastVerificationEmailSent) {
      const cooldownMs = 2 * 60 * 1000; // 2分鐘冷卻時間
      const timePassed = Date.now() - user.lastVerificationEmailSent.getTime();
      
      if (timePassed < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timePassed) / 60000);
        return res.status(429).json({ 
          error: `請等待 ${remainingMinutes} 分鐘後再重新寄送驗證信` 
        });
      }
    }

    // 產生新的驗證 token
    const newVerificationToken = crypto.randomBytes(32).toString('hex');
    const newVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小時後過期
    const now = new Date();

    // 更新資料庫中的 token
    await db
      .update(usersTable)
      .set({
        emailVerificationToken: newVerificationToken,
        emailVerificationExpires: newVerificationExpires,
        lastVerificationEmailSent: now,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, user.id));

    // 寄送新的驗證信
    const emailResult = await sendVerificationEmail(
      email, 
      newVerificationToken, 
      user.username
    );

    if (!emailResult.success) {
      console.error('重新寄送驗證信失敗:', emailResult.error);
      return res.status(500).json({ 
        error: "寄送驗證信失敗，請稍後再試" 
      });
    }

    return res.status(200).json({ 
      message: "新的驗證信已寄送，請檢查您的信箱"
    });

  } catch (err) {
    console.error('重新寄送驗證信過程發生錯誤:', err);
    return res.status(500).json({ 
      error: "處理請求失敗，請稍後再試" 
    });
  }
};

module.exports = { signup, login, verifyEmail, resendVerificationEmail };
