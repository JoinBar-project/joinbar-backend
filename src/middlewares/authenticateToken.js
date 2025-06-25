const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const dayjs = require('dayjs');

const SECRET_KEY = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!SECRET_KEY || !REFRESH_SECRET) {
  console.error(
    'Missing required environment variables: SECRET_KEY, REFRESH_SECRET'
  );
  process.exit(1); // 沒有環境變數則直接終止程式
}

const handleRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    console.log('沒有 Refresh Token');
    return res.status(401).json({ error: 'Refresh token required', message: '需要重新登入' });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err, user) => {
    if(err) {
      console.log('Refresh Token 驗證失敗:', { error: err.name, message: err.message });
      return res.status(401).json({ error: 'Invalid refresh token', message: '請重新登入' });
    }

    console.log('Refresh Token 驗證成功:', { userId: user.id, tokenType: user.type });

    if(user.type && user.type !== 'refresh') {
      console.log('Refresh Token 類型錯誤:', user.type);
      return res.status(403).json({ error: 'Invalid refresh token type', message: 'Refresh Token 類型無效' });
    }

    try {
      const newAccessToken = jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        type: 'access'
      }, SECRET_KEY, { 
        expiresIn: "15m" 
      });

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/'
      });
      console.log('Access Token 已自動刷新');

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        authMethod: 'cookie-refreshed'
      };

      console.log('用戶認證已刷新，設定 req.user:', { id: req.user.id, username: req.user.username, role: req.user.role, authMethod: req.user.authMethod });
      next();
    } catch(err) {
      console.error('刷新 Token 過程發生錯誤:', err);
      return res.status(500).json({ error: 'Token refresh error', message: '刷新認證失敗' });
    }
  });
};

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    let authMethod = 'none';

    // Email 登入 Authorization header
    if(authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader?.split(' ')[1];
      authMethod = 'bearer';
      console.log('檢測到 Bearer Token，長度:', token.length);
    }

    // LINE 登入 cookies 中的 access_token
    if(!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
      authMethod = 'cookie';
      console.log('檢測到 Cookie Token，長度:', token.length);

      if (req.cookies.user_info) {
        try {
          const userInfo = JSON.parse(req.cookies.user_info);
          console.log('用戶 Cookie 資訊:', {
            id: userInfo.id,
            username: userInfo.username,
            providerType: userInfo.providerType
          });
        } catch(err) {
          console.log('用戶 Cookie 解析失敗');
        }
      }
    }

    if (!token) {
      console.log('未找到任何認證 token');
      return res.status(401).json({ error: 'Access token required', message: '需要登入才能存取此資源' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
      if(err) {
        console.log('Token 驗證失敗:', { error: err.name, message: err.message, authMethod });

        if (err.name === 'TokenExpiredError') {
          console.log('Token 已過期');

          // 如果是 cookie 認證，嘗試使用 refresh token
          if (authMethod === 'cookie' && req.cookies && req.cookies.refresh_token) {
            console.log('嘗試使用 Refresh Token 自動刷新');
            return handleRefreshToken(req, res, next);
          }

          return res.status(401).json({ error: 'Token expired', message: 'Token 已過期，請重新登入' });
        }
        return res.status(403).json({ error: 'Invalid token', message: 'Token 無效' })
      }

      console.log('Token 驗證成功:', { userId: user.id, username: user.username, email: user.email, tokenType: user.type, authMethod, expiresAt: dayjs.unix(user.exp).format('YYYY-MM-DD HH:mm:ss') });

      if(user.type && user.type !== 'access') {
        console.log('Token 類型錯誤，期望: access，實際:', user.type);
        return res.status(403).json({ error: 'Invalid token type', message: 'Token 類型無效' });
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        authMethod: authMethod
      };

      console.log('用戶認證成功，設定 req.user:', { id: req.user.id, username: req.user.username, role: req.user.role, authMethod: req.user.authMethod });

      next();
    });
  } catch(err) {
    console.error('認證發生未預期錯誤:', err);
    return res.status(500).json({ error: 'Authentication error', message: '認證發生錯誤' });
  }
};

module.exports =  authenticateToken;