const db = require('../config/db');
const { usersTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const bcrypt = require('bcrypt');

const deleteAccount = async (req, res) => {
	const userId = req.user.id;
	const { password, confirmText } = req.body;

	try {
		const [user] = await db
      .select()
			.from(usersTable)
			.where(and(eq(usersTable.id, userId), eq(usersTable.status, 1)))
			.limit(1);

		if(!user) {
			return res.status(404).json({ success: false, error: '找不到用戶或帳戶已被刪除' });
		}

		if(confirmText !== '刪除我的帳戶') {
			return res.status(400).json({ success: false, error: '請輸入正確的確認文字：刪除我的帳戶' });
		}

		if(user.providerType !== 'email' && user.password) {
			if(!password) {
				return res.status(400).json({ success: false, error: '請輸入密碼以確認身份' });
			}

			const isPasswordValid = await bcrypt.compare(password, user.password);
			if(!isPasswordValid) {
			return res.status(401).json({ success: false, error: '密碼錯誤' });
			}
		}

		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-');
		const deletedEmail = user.email ? `${user.email}.deleted.${timestamp}` : null;
		const deletedLineUserId = user.lineUserId ? `${user.lineUserId}.deleted.${timestamp}` : null;
		const [deletedUser] = await db
      .update(usersTable)
			.set({
				status: 2, 
				email: deletedEmail,
				lineUserId: deletedLineUserId,
				password: null, 
				updatedAt: now,
				birthday: null,
        avatarUrl: null,
        linePictureUrl: null,
        lineStatusMessage: null
			})
			.where(eq(usersTable.id, userId))
			.returning({
				id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        status: usersTable.status,
        updatedAt: usersTable.updatedAt
			});
		console.log(`帳戶註銷: 用戶 ${user.username} (ID: ${userId}) 於 ${now.toISOString()} 註銷帳戶`);

		return res.status(200).json({ success: true, message: '帳戶已成功註銷，感謝您的使用', data: { deletedAt: now, userId: deletedUser.id } });
	} catch(err) {
		console.error('帳戶註銷過程發生錯誤:', err);
		return res.status(500).json({ success: false, error: '帳戶註銷過程發生錯誤' });
	}
};

const getDeletionWarning = async (req, res) => {
	const userId = req.user.id;

	try {
		const [user] = await db
      .select({
				id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email || null,
				lineUserId: usersTable.lineUserId || null,
        providerType: usersTable.providerType,
        createdAt: usersTable.createdAt,
			})
			.from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.status, 1)))
      .limit(1);

			if (!user) {
      return res.status(404).json({
        success: false,
        error: '找不到用戶'
      });
    }

		const warningInfo = {
      accountInfo: {
        username: user.username,
        email: usersTable.email || null,
				lineUserId: usersTable.lineUserId || null,
        providerType: user.providerType
      },
			consequences: [
        '您將永久無法使用此帳戶登入',
        '您的所有個人資料將被立即清除',
        '此操作立即生效且不可逆轉',
        '無法提供帳戶恢復服務'
      ],
			requirements: user.providerType === 'email' ? [
        '需要輸入當前密碼確認身份',
        '需要輸入確認文字：「刪除我的帳戶」'
      ] : [
        '需要輸入確認文字：「刪除我的帳戶」'
      ],
			alternatives: [
        '注意：一旦確認註銷，將無法恢復'
      ]
		};

		return res.status(200).json({
      success: true,
      data: warningInfo
    });
	} catch(err) {
		console.error('獲取註銷警告資訊時發生錯誤:', err);
    return res.status(500).json({
      success: false,
      error: '獲取資訊失敗'
    });
	}
};

module.exports = { deleteAccount, getDeletionWarning };