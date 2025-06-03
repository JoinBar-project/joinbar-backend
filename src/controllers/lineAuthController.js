const dotenv = require('dotenv');

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