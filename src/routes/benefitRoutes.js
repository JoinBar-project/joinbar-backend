const express = require('express')
const { createBenefit } = require('../controllers/benefitControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatBigIntResponse = require('../middlewares/formatBigIntResponse');


const router = express.Router()

router.post('/', authenticateToken, formatBigIntResponse, withTaiwanTime, createBenefit)

module.exports = router