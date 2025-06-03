const dotenv = require('dotenv');
const axios = require('axios');

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

// 產生 LINE Login 的 OAuth 2.0 授權 UR
const getLineAuthUrl = async (req, res) => {
  try {
    // 產生隨機 state 參數防止 CSRF 攻擊 產生一個介於0~1之間的數 再用36進位制轉換成字串 從索引2開始取15個字元也就是去掉"0."
    const state = Math.random().toString(36).substring(2, 15);
    
		// 建立 LINE 授權 URL
    const lineAuthUrl = 'https://access.line.me/oauth2/v2.1/authorize?' +
      `response_type=code&` +      // 指定要取得授權碼
      `client_id=${LINE_CHANNEL_ID}&` +   // 我設置的 LINE Channel ID
      `redirect_uri=${encodeURIComponent(LINE_CALLBACK_URL)}&` +  // 回調 URL，必須與 LINE 開發者控制台中設定的回調 URL 相同
      `state=${state}&` +  // CSRF 保護的隨機字串 上面設的隨機 state 參數 會跟著一起送到Line的授權伺服器 回傳時會帶回來以證明是我發出的請求
      `scope=profile%20openid`; // 要求的權限範圍 這裡要求 profile 和 openid 權限

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
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token',   // 這是 LINE 官方的 Token 端點
      new URLSearchParams({ // 瀏覽器和 Node.js 的內建 API，專門用來處理 URL 查詢字串和表單數據
        grant_type: 'authorization_code',   // OAuth 2.0 的授權類型
        code: code,    // LINE 重導向回來時帶的一次性代碼
        redirect_uri: LINE_CALLBACK_URL, 
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded' // 設定請求的內容類型為表單數據 LINE API 要求的格式
        }
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
	} catch(err) {}
}