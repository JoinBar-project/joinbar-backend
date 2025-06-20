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

// 統一錯誤處理函數
const handleError = (error, message, res) => {
  // 如果有錯誤物件，則將其轉為字串
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
  } else {
    console.error(message, error);
  }
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const errorUrl = `${frontendUrl}/login?error=${encodeURIComponent(message)}`;
  return res.redirect(errorUrl);
};

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
      return handleError(
        new Error('Missing authorization code'), 
        '授權碼不存在，請重新登入', 
        res
      );
    }

    // 1. 驗證 state 參數是否匹配
    if (!state || !stateCache.has(state)) {
      return handleError(
        new Error('Invalid state parameter'), 
        '安全驗證失敗，請重新登入', 
        res
      );
    }

    // 驗證通過後從快取中移除 state
    stateCache.delete(state);

    // 2. 用授權碼換取 access token
    let tokenResponse;
    // 使用 axios 發送 POST 請求到 LINE 的 token 端點 這裡使用 try-catch 處理可能的錯誤
    try {
      tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token',    // 這是 LINE 官方的 Token 端點
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
        timeout: 10000 // 設定請求超時時間為 10 秒
      }
    );
    } catch (err) {
      return handleError(err, '取得存取權杖失敗，請重新登入', res);
    }

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      return handleError(
        new Error('Invalid token response'), 
        '取得存取權杖失敗，請重新登入', 
        res
      );
    }

		 // 3. 使用剛取得的 access token 向 LINE API 請求用戶的基本資料
    let profileResponse;
    // 使用 axios 發送 GET 請求到 LINE 的 profile 端點
    try {
      profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      timeout: 10000 // 延長到 10 秒
    });
    } catch(err) {
      return handleError(err, '無法取得 LINE 用戶資料，請重新登入', res);
    }

    const lineProfile = profileResponse.data;
    console.log('LINE Profile retrieved:', {
      userId: lineProfile.userId,
      displayName: lineProfile.displayName,
      pictureUrl: lineProfile.pictureUrl,
      statusMessage: lineProfile.statusMessage,
    });


		// 4. 透過 LINE User ID 或 email 檢查用戶是否已存在
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.lineUserId, lineProfile.userId))
      .limit(1);

			let userResult;
      try {
        if (existingUser) {
      // 5a. 更新現有用戶的 LINE 資料
      [userResult] = await db
        .update(usersTable)
        .set({
          lineUserId: lineProfile.userId, // LINE 用戶 ID
          lineDisplayName: lineProfile.displayName, // LINE 顯示名稱
          linePictureUrl: lineProfile.pictureUrl || null, // 處理可能的 undefined LINE 大頭照 URL
          lineStatusMessage: lineProfile.statusMessage || null, // LINE 狀態訊息
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
			// 6b. 建立新用戶
      [userResult] = await db
        .insert(usersTable)
        .values({
          username: lineProfile.displayName,
          nickname: lineProfile.displayName,
          email: null, // LINE 用戶可能沒有提供 email
          password: null, // LINE 用戶不需要密碼
          lineUserId: lineProfile.userId, // LINE 的唯一識別碼
          lineDisplayName: lineProfile.displayName, // LINE 顯示名稱
          linePictureUrl: lineProfile.pictureUrl || null, // 處理可能的 undefined LINE 大頭照 URL
          lineStatusMessage: lineProfile.statusMessage || null, // 處理可能的 undefined LINE 個簽
          isLineUser: true, // 標記為 LINE 用戶
          isVerifiedEmail: false,
          providerType: 'line', // 第三方登入提供者
          providerId: lineProfile.userId, // 第三方提供者的用戶 ID
          avatarUrl: lineProfile.pictureUrl || null,  // 處理可能的 undefined 頭像 URL（使用 LINE 大頭照）
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
      } catch(err) {
        console.error('Database operation failed:', err);
        return handleError(err, '用戶資料處理失敗，請重新登入', res);
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

		// 7. 重導向到前端並帶上 tokens 使用 HTTP-only cookies 設定 access token cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true, // 防止 JavaScript 存取
      secure: process.env.NODE_ENV === 'production', // HTTPS 環境才設定 secure
      sameSite: 'lax', // CSRF 保護
      maxAge: 15 * 60 * 1000, // 15 分鐘 (毫秒)
      path: '/' // 整個網站都可以使用
    });

    // 設定 refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // 防止 JavaScript 存取
      secure: process.env.NODE_ENV === 'production', // HTTPS 環境才設定 secure
      sameSite: 'lax', // CSRF 保護
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天 (毫秒)
      path: '/' // 整個網站都可以使用
    });

    // 用戶資料也可以用 cookie 傳遞（非敏感資料）
    res.cookie('user_info', JSON.stringify({
      id: userResult.id,
      username: userResult.username,
      email: userResult.email,
      role: userResult.role,
      lineDisplayName: userResult.lineDisplayName
    }), {
      httpOnly: false, // 允許前端讀取用戶資料
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      path: '/'
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?success=true`);
	} catch(err) {
		return handleError(err, 'LINE 登入處理過程發生錯誤，請重新登入', res);
	}
};

// LINE 登出（撤銷 token）
const lineLogout = async (req, res) => {
  try {
    // 從 cookies 中取得用戶資訊
    const userInfo = req.cookies.user_info;
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        console.log('正在登出用戶:', user.username);
      } catch (err) {
        console.log('無法解析用戶資訊,跳過額外處理');
      }
    }

    // 清除所有相關的 cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('user_info', { path: '/' });

    res.json({ message: 'LINE 登出成功' });
  } catch (error) {
    console.error('LINE logout error:', error);

    // 即使撤銷失敗，也清除 cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('user_info', { path: '/' });

    // 即使撤銷失敗，也回傳成功（用戶端已登出）
    res.json({ message: 'LINE 登出成功' });
  }
};

module.exports = {
  getLineAuthUrl,
  lineCallback,
  lineLogout
};