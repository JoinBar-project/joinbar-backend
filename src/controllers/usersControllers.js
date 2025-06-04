const db = require('../config/db');
const { usersTable } = require('../models/schema');
const dotenv = require('dotenv');
dotenv.config();

const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '你無權限查看',
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
      error: err.message,
    });
  }
};

module.exports = getAllUsers;
