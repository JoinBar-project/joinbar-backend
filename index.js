const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/authRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');
const cors = require('cors');
const { corsOptions } = require('./src/config/cors');
const lineAuthRoutes = require("./src/routes/lineAuthRoutes");
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
app.use(cookieParser()); 
app.use(express.json());
app.use(cors(corsOptions));

app.use("/api/auth/line", lineAuthRoutes);
app.use("/api/auth", authRoutes);
app.use('/event', eventRoutes);
app.use('/tags', tagsRoutes);

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

