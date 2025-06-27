const express = require('express');
const router = express.Router();
const barController = require('../controllers/barController');
const withTaiwanTime = require('../middlewares/withTaiwanTime');
router.use(withTaiwanTime);

router.get('/bars', barController.getBars);
router.post('/bars', barController.createBar);

module.exports = router;
