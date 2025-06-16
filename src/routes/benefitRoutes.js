const express = require('express')
const { createBenefit, getBenefit } = require('../controllers/benefitControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatBigIntResponse = require('../middlewares/formatBigIntResponse');


const router = express.Router()

router.post('/create', authenticateToken, formatBigIntResponse, withTaiwanTime, createBenefit)
router.get('/', authenticateToken, formatBigIntResponse, withTaiwanTime, getBenefit)


module.exports = router