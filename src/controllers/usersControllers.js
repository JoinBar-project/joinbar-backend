const db = require('../config/db');
const { usersTable } = require('../models/schema');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');
dotenv.config();

const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '你無權限查看',
      });
    }

    const userResult = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        email: usersTable.email,
        role: usersTable.role,
        birthday: usersTable.birthday,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.status, 1));
    res.status(200).json({
      success: true,
      data: userResult,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '伺服器錯誤',
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id); // 將 URL 裡的 id 從字串轉成整數

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '你無權限查看',
      });
    }

    const [userResult] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        email: usersTable.email,
        role: usersTable.role,
        birthday: usersTable.birthday,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!userResult) {
      return res.status(404).json({
        success: false,
        message: '查無此使用者',
      });
    }

    return res.status(200).json({
      success: true,
      data: userResult,
    });
  } catch (err) {
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

module.exports = { getAllUsers, getUserById };
