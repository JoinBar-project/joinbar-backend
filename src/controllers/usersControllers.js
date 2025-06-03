const db = require('../config/db');
const { usersTable } = require('../models/schema');
const dotenv = require('dotenv');
dotenv.config();

const getAllUsers = async (req, res) => {
  try {
    const userResult = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        email: usersTable.email,
      })
      .from(usersTable);
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
