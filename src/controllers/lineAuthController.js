const dotenv = require('dotenv');
const axios = require('axios');
const db = require('../config/db');
const { usersTable } = require('../models/schema');
const { eq, or } = require('drizzle-orm');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
// 驗證 JWT 和 Refresh Token 的必要環境變數
if(!JWT_SECRET || !REFRESH_SECRET) {
	console.error('Missing required environment variables: JWT_SECRET, REFRESH_SECRET');
  process.exit(1);  // 直接終止應用
}

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL;
// 驗證必要環境變數
if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET || !LINE_CALLBACK_URL) {
  console.error('Missing LINE environment variables');
  process.exit(1);
}

// 儲存 state 的記憶體快取
const stateCache = new Map();

const testLineChannelId = async (channelId) => {
  try {
    // 嘗試使用 Channel ID 和 Secret 取得 access token
    const response = await axios.post('https://api.line.me/v2/oauth/accessToken', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: channelId,
        client_secret: LINE_CHANNEL_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000 // 15 秒逾時
      }
    );
    
    if (response.data.access_token) {
      console.log('LINE_CHANNEL_ID is valid and active');
      return true;
    }
  } catch (error) {
    console.error('LINE_CHANNEL_ID validation failed:', error.response?.data || error.message);
    return false;
  }
};

const validateState = (state) => {
  if (!state || state.length < 16) {
    throw new Error('Invalid state parameter');
  }
  return true;
};

// 清理過期的 state
const cleanupExpiredStates = () => {
  const now = Date.now();
  for (const [state, data] of stateCache.entries()) {
    if (now > data.expires) {
      stateCache.delete(state);
    }
  }
};

// 產生 LINE Login 的 OAuth 2.0 授權 URL
const getLineAuthUrl = async (req, res) => {
  try {
    // 先驗證 LINE 設定是否有效
    const isValid = await testLineChannelId(LINE_CHANNEL_ID);
    if (!isValid) {
      console.error('❌ LINE Channel validation failed');
      return res.status(503).json({ 
        error: 'LINE 登入服務暫時無法使用，請稍後再試或使用其他登入方式',
        code: 'LINE_SERVICE_UNAVAILABLE'
      });
    }
    // 產生隨機 state 參數防止 CSRF 攻擊
    const state = crypto.randomBytes(16).toString('hex');

    // 簡單驗證 state
    try {
      validateState(state);
    } catch (error) {
      console.error('❌ State generation failed:', error.message);
      return res.status(500).json({ 
        error: '安全參數生成失敗',
        code: 'STATE_GENERATION_ERROR'
      });
    }

    // 儲存 state 到快取，設定 10 分鐘過期
    stateCache.set(state, {
      timestamp: Date.now(),
      expires: Date.now() + (10 * 60 * 1000) // 10 分鐘後過期
    });

    // 定期清理過期的 state
    cleanupExpiredStates();

		// 建立 LINE 授權 URL
    const lineAuthUrl = 'https://access.line.me/oauth2/v2.1/authorize?' +
      new URLSearchParams({
        response_type: 'code', // 授權類型，這裡是授權碼
        client_id: LINE_CHANNEL_ID, // LINE Channel ID
        redirect_uri: LINE_CALLBACK_URL, // 回調 URL，必須與 LINE 開發者控制台中設定的回調 URL 相同 URLSearchParams 會自動編碼 encodeURIComponent(LINE_CALLBACK_URL) 會造成雙重編碼
        state: state, // CSRF 保護的隨機字串 上面設的隨機 state 參數 會跟著一起送到Line的授權伺服器 回傳時會帶回來以證明是我發出的請求
        scope: 'profile openid' // 要求的權限範圍 這裡要求 profile 和 openid 權限
      }).toString();

    res.json({ 
			// 回傳授權 URL 和 state 給前端
      authUrl: lineAuthUrl,
      state: state 
    });
  } catch (error) {
    console.error('LINE auth URL generation error:', error);
    res.status(500).json({ error: '產生 LINE 授權連結失敗' });
  }
};

// 處理 LINE callback  LINE 登入的最後階段，用戶在 LINE 授權頁面同意後，會被重導向回這個 callback 端點
const lineCallback = async (req, res) => {
  try {
    const { code, state } = req.query; // LINE 回傳的授權碼，用來換取 access token

    if (!code) {
      return res.status(400).json({ error: '授權碼不存在' });
    }

    // 1. 用授權碼換取 access token
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token',    // 這是 LINE 官方的 Token 端點
      new URLSearchParams({ // 瀏覽器和 Node.js 的內建 API，專門用來處理 URL 查詢字串和表單數據
        grant_type: 'authorization_code',   // OAuth 2.0 的授權類型
        code: code,    // LINE 重導向回來時帶的一次性代碼
        redirect_uri: LINE_CALLBACK_URL, 
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded' // 設定請求的內容類型為表單數據 LINE API 要求的格式
        },
        timeout: 5000 // 設定請求超時時間為 5 秒
      }
    );

    const { access_token } = tokenResponse.data;

		 // 2. 使用剛取得的 access token 向 LINE API 請求用戶的基本資料
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const lineProfile = profileResponse.data;
    console.log('LINE Profile:', lineProfile);

		// 3. 透過 LINE User ID 或 email 檢查用戶是否已存在
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.lineUserId, lineProfile.userId),
          eq(usersTable.email, lineProfile.email || '') // LINE 用戶可能沒有 email
        )
      )
      .limit(1);

			let userResult;

			if (existingUser) {
      // 4a. 更新現有用戶的 LINE 資料
      [userResult] = await db
        .update(usersTable)
        .set({
          lineUserId: lineProfile.userId, // LINE 用戶 ID
          lineDisplayName: lineProfile.displayName, // LINE 顯示名稱
          linePictureUrl: lineProfile.pictureUrl, // LINE 大頭照 URL
          lineStatusMessage: lineProfile.statusMessage, // LINE 狀態訊息
          isLineUser: true, // 標記為 LINE 用戶
          providerType: 'line', // 登入提供者類型
          updatedAt: new Date() // 更新時間
        })
        .where(eq(usersTable.id, existingUser.id))
        .returning({  // 回傳指定欄位 這些資料會用來產生 JWT token
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          role: usersTable.role,
          lineDisplayName: usersTable.lineDisplayName
        });
    } else {
			// 4b. 建立新用戶
      [userResult] = await db
        .insert(usersTable)
        .values({
          username: lineProfile.displayName,
          nickname: lineProfile.displayName,
          email: null, // LINE 用戶可能沒有提供 email
          password: null, // LINE 用戶不需要密碼
          lineUserId: lineProfile.userId, // LINE 的唯一識別碼
          lineDisplayName: lineProfile.displayName, // LINE 顯示名稱
          linePictureUrl: lineProfile.pictureUrl, // LINE 大頭照 URL
          lineStatusMessage: lineProfile.statusMessage, // LINE 個簽
          isLineUser: true, // 標記為 LINE 用戶
          isVerifiedEmail: false,
          providerType: 'line', // 第三方登入提供者
          providerId: lineProfile.userId, // 第三方提供者的用戶 ID
          avatarUrl: lineProfile.pictureUrl,  // 頭像 URL（使用 LINE 大頭照）
          role: 'user'
        })
        .returning({ // 回傳指定欄位 這些資料會用來產生 JWT token
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          role: usersTable.role,
          lineDisplayName: usersTable.lineDisplayName
        });
		}

		// 5. 產生 JWT tokens
    const accessToken = jwt.sign({
      id: userResult.id,
      username: userResult.username,
      email: userResult.email,
      type: 'access'
    }, JWT_SECRET, { 
      expiresIn: "15m" 
    });

    const refreshToken = jwt.sign({
      id: userResult.id,
      type: 'refresh'
    }, REFRESH_SECRET, { 
      expiresIn: "7d" 
    });

		// 6. 重導向到前端並帶上 tokens
    // 你可以選擇重導向到前端或是回傳 JSON
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/line/success?` +
      `access_token=${accessToken}&` +
      `refresh_token=${refreshToken}&` +
      `user=${encodeURIComponent(JSON.stringify(userResult))}`; // 將用戶資料轉成 JSON 字串並編碼

    res.redirect(redirectUrl);
	} catch(err) {
		console.error('LINE callback error:', err);
    
    // 重導向到前端錯誤頁面
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const errorUrl = `${frontendUrl}/auth/line/error?message=${encodeURIComponent('LINE 登入失敗')}`;
    
    res.redirect(errorUrl);
	}
};

// LINE 登出（撤銷 token）
const lineLogout = async (req, res) => {
  try {
    const { lineAccessToken } = req.body; // 請求 body 中取得用戶的 LINE access token 之前登入時從 LINE 取得的
    
    if (lineAccessToken) {
      // 撤銷 LINE access token
      await axios.post('https://api.line.me/oauth2/v2.1/revoke',  // LINE 官方的 token 撤銷端點
        new URLSearchParams({
          access_token: lineAccessToken, // 要撤銷的 access token
          client_id: LINE_CHANNEL_ID,
          client_secret: LINE_CHANNEL_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
    }

    res.json({ message: 'LINE 登出成功' });
  } catch (error) {
    console.error('LINE logout error:', error);
    // 即使撤銷失敗，也回傳成功（用戶端已登出）
    res.json({ message: 'LINE 登出成功' });
  }
};

module.exports = {
  getLineAuthUrl,
  lineCallback,
  lineLogout
};