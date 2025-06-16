const db = require('../config/db');
const { usersTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const dotenv = require('dotenv');
dotenv.config();

const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '無權限查看',
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
    const userId = Number(req.params.id);

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '無權限查看',
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
        providerType: usersTable.providerType,
      })
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.status, 1)))
      .limit(1);

    if (!userResult) {
      return res.status(404).json({
        success: false,
        message: '查無此使用者或帳戶已被註銷',
      });
    }

    return res.status(200).json({
      success: true,
      data: userResult,
    });
  } catch (err) {
    console.error('獲取用戶資料時發生錯誤:', err);
    return res.status(500).json({
      success: false,
      message: '伺服器錯誤',
    });
  }
};

const patchUserById = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '無權限修改',
      });
    }

    // 檢查用戶是否存在且為啟用狀態
    const [existingUser] = await db
      .select({ id: usersTable.id, status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '查無此使用者',
      });
    }

    if (existingUser.status !== 1) {
      return res.status(400).json({
        success: false,
        message: '無法修改已註銷的帳戶',
      });
    }

    const { username, nickname, birthday, avatarUrl } = req.body;

    const fieldsToUpdate = {};
    if (username) fieldsToUpdate.username = username;
    if (nickname) fieldsToUpdate.nickname = nickname;
    if (birthday) fieldsToUpdate.birthday = birthday;
    if (avatarUrl) fieldsToUpdate.avatarUrl = avatarUrl;

    const [updatedUser] = await db
      .update(usersTable)
      .set(fieldsToUpdate)
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        birthday: usersTable.birthday,
        avatarUrl: usersTable.avatarUrl,
        email: usersTable.email,
      });

    res.status(200).json({
      success: true,
      message: '更新資料成功',
      data: updatedUser,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '伺服器錯誤',
    });
  }
};

// 獲取已註銷的用戶列表（僅管理員）
const getDeletedUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '無權限查看',
      });
    }

    const deletedUsers = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt 
      })
      .from(usersTable)
      .where(eq(usersTable.status, 2)); 

    res.status(200).json({
      success: true,
      message: `找到 ${deletedUsers.length} 個已註銷的帳戶`,
      data: deletedUsers,
    });
  } catch (err) {
    console.error('獲取已註銷用戶列表時發生錯誤:', err);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤',
    });
  }
};

module.exports = { getAllUsers, getUserById, patchUserById, getDeletedUsers };
