const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/authRoutes');
const usersRoutes = require('./src/routes/usersRoutes')
const eventRoutes = require('./src/routes/eventRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const subRoutes = require('./src/routes/subRoutes');
const linePayRoutes = require('./src/routes/linePayRoutes');
const barTagsRoutes = require('./src/routes/barTagsRoutes');
const lineAuthRoutes = require('./src/routes/lineAuthRoutes');
const accountDeletionRoutes = require('./src/routes/accountDeletionRoutes');

const cors = require('cors');
const { corsOptions } = require('./src/config/cors');
const cookieParser = require('cookie-parser');
const formatBigIntResponse = require('./src/middlewares/formatBigIntResponse');
const withTaiwanTime = require('./src/middlewares/withTaiwanTime');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

dotenv.config();

const app = express();

app.use(cookieParser()); 
app.use(express.json());
app.use(cors(corsOptions));

app.use(formatBigIntResponse);
app.use(withTaiwanTime);

app.use('/api/auth/line', lineAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/account', accountDeletionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/linepay', linePayRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/sub', subRoutes);
app.use('/api/barTags', barTagsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => {
   res.json({ 
       status: 'OK', 
       timestamp: new Date().toISOString(),
       services: {
           database: 'connected',
           linepay: 'sandbox-mode'
       }
   });
});

app.use((req, res) => {
  res.status(404).json({ 
    error: '找不到該路由',
    message: `路徑 ${req.originalUrl} 不存在` 
  });
});

app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({
  error: '伺服器內部錯誤',
  message: process.env.NODE_ENV === 'development' ? err.message : '請稍後再試'
  });
});

app.listen(3000, () => {
 console.log('🚀 伺服器已啟動 http://localhost:3000');
 console.log('📊 Health check: http://localhost:3000/health');
 console.log('🔐 LINE Auth URL: http://localhost:3000/api/auth/line/url');
 console.log('💳 LINE Pay API: http://localhost:3000/api/linepay');
 console.log('🏗️ LINE Pay 模式: 沙盒環境 (安全測試)');
 
 if (!process.env.LINEPAY_CHANNEL_ID || !process.env.LINEPAY_CHANNEL_SECRET) {
   console.warn('⚠️  LINE Pay 環境變數未設定，請參考 .env.example');
 } else {
   console.log('✅ LINE Pay 沙盒設定已載入');
 }
});