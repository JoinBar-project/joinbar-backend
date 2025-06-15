const express = require('express')
const { createSubscription } = require('../controllers/subscriptionControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatBigIntResponse = require('../middlewares/formatBigIntResponse');


const router = express.Router()

router.post('/', authenticateToken,formatBigIntResponse,  withTaiwanTime, createSubscription)

module.exports = router