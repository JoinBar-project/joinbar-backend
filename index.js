const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const authRoutes = require('./src/routes/authRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const subRoutes = require('./src/routes/subRoutes');
const benefitRoutes = require('./src/routes/benefitRoutes');
const linePayRoutes = require('./src/routes/linePayRoutes');
const barTagsRoutes = require('./src/routes/barTagsRoutes');
const lineAuthRoutes = require('./src/routes/lineAuthRoutes');
const accountDeletionRoutes = require('./src/routes/accountDeletionRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const GeminiRoutes = require('./src/routes/GeminiRoutes');
const barRoutes = require('./src/routes/barRoutes');


const cors = require('cors');
const { corsOptions } = require('./src/config/cors');
const cookieParser = require('cookie-parser');

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));
app.use('/api/auth/line', lineAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/account', accountDeletionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/linepay', linePayRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/sub', subRoutes);
app.use('/api/benefit', benefitRoutes);
app.use('/api/barTags', barTagsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/cart', cartRoutes);
app.use('/api/barAi', GeminiRoutes);
app.use('/api', barRoutes);


app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      linepay: "sandbox-mode",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "找不到該路由",
    message: `路徑 ${req.originalUrl} 不存在`,
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // 處理 Multer 的錯誤
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "圖片大小超過限制（1MB）" });
    }
    return res
      .status(400)
      .json({ message: '圖片上傳錯誤', error: err.message });
  }

  if (err.message === "不支援的圖片格式") {
    return res.status(400).json({ message: "只支援 jpg/png/webp 圖片格式" });
  }

  console.error("伺服器錯誤:", err);
  res.status(500).json({
    error: '伺服器內部錯誤',
    message:
      process.env.NODE_ENV === 'development' ? err.message : '請稍後再試',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, HOST, () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const serverUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  
  console.log(`🚀 伺服器已啟動於 ${serverUrl}`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: ${serverUrl}/health`);
  console.log(`🔄 Ready check: ${serverUrl}/ready`);
  console.log(`🔐 LINE Auth URL: ${serverUrl}/api/auth/line/url`);
  console.log(`💳 LINE Pay API: ${serverUrl}/api/linepay`);
  console.log(`🏗️ LINE Pay 模式: ${isProduction ? '生產環境' : '沙盒環境'}`);

  const requiredEnvVars = [
    'LINEPAY_CHANNEL_ID',
    'LINEPAY_CHANNEL_SECRET',
    'FRONTEND_URL'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn("⚠️  缺少必要的環境變數:", missingEnvVars.join(', '));
    console.warn("⚠️  請在 Zeabur 控制台設置這些環境變數");
  } else {
    console.log("✅ 所有必要的環境變數已設置");
  }
  
  if (isProduction) {
    console.log("🔒 生產環境已啟動");
  } else {
    console.log("🛠️ 開發環境已啟動");
  }
});