const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/authRoutes');
const usersRoutes = require('./src/routes/usersRoutes')
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
app.use('/api/users', usersRoutes);
app.use('/event', eventRoutes);
app.use('/tags', tagsRoutes);


app.listen(3000, () => {
  console.log('伺服器已啟動 http://localhost:3000');
  console.log(`LINE Auth URL: http://localhost:3000/api/auth/line/url`)
});

