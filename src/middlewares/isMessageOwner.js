const db = require('../config/db');
const { messages } = require('../models/schema');
const { eq } = require('drizzle-orm');

const isMessageOwner = async (req, res, next) => {
  const userId = req.user?.id;
  const messageId = req.params.messageId;

  try {
    const [msg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));

    if (!msg) {
      return res.status(404).json({ message: '留言不存在' });
    }

    if (msg.userId !== userId) {
      return res.status(403).json({ message: '無權限操作此留言' });
    }

    next();
  } catch (err) {
    console.error('權限檢查失敗:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

module.exports = isMessageOwner;