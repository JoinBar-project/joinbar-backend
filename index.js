const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/authRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');
const orderRoutes = require('./src/routes/orderRoutes');

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',    
    'http://localhost:3000',    
    'http://localhost:8080',    
    'http://127.0.0.1:5173'     
  ],
  credentials: true,            
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use('/event', eventRoutes);
app.use('/tags', tagsRoutes);
app.use('/api/orders', orderRoutes);


app.listen(3000, () => {
  console.log('伺服器已啟動 http://localhost:3000');
});

