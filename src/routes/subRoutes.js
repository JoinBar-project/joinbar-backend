const express = require('express')
const { createSubscription, getAllPlans, getPlan } = require('../controllers/subscriptionControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatBigIntResponse = require('../middlewares/formatBigIntResponse');


const router = express.Router()

router.post('/', authenticateToken, formatBigIntResponse, withTaiwanTime, createSubscription)
router.get('/allPlans', formatBigIntResponse, withTaiwanTime, getAllPlans)
router.get('/plan', authenticateToken, formatBigIntResponse, withTaiwanTime, getPlan)


module.exports = router