const express = require('express');
const router = express.Router();
const barController = require('../controllers/barController');
const withTaiwanTime = require('../middlewares/withTaiwanTime');
router.use(withTaiwanTime);

router.get('/getbars', barController.getBars);
router.post('/createbars', barController.createBar);

module.exports = router;
