const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/authRoutes');
const usersRoutes = require('./src/routes/usersRoutes')
const eventRoutes = require('./src/routes/eventRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const subRoutes = require('./src/routes/subRoutes');
const benefitRoutes = require('./src/routes/benefitRoutes');
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
app.use('/api/event', eventRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/sub', subRoutes);
app.use('/api/benefit', benefitRoutes);
app.use('/api/barTags', barTagsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康檢查路由
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({ 
    error: '找不到該路由',
    message: `路徑 ${req.originalUrl} 不存在` 
  });
});

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({
  error: '伺服器內部錯誤',
  message: process.env.NODE_ENV === 'development' ? err.message : '請稍後再試'
  });
});

app.listen(3000, () => {
  console.log('伺服器已啟動 http://localhost:3000');
  console.log(`Health check: http://localhost:3000/health`);
  console.log(`LINE Auth URL: http://localhost:3000/api/auth/line/url`)
});

