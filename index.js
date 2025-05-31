const express = require('express');
const dotenv = require('dotenv');
const eventRoutes = require('./src/routes/eventRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');


dotenv.config();

const app = express();
app.use(express.json());

app.use('/event', eventRoutes);
app.use('/tags', tagsRoutes);


app.listen(3000, () => {
  console.log('伺服器已啟動 http://localhost:3000');
});

