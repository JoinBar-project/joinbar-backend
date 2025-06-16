const express = require('express')
const { createBenefit, getBenefit, updateBenefit } = require('../controllers/benefitControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatBigIntResponse = require('../middlewares/formatBigIntResponse');


const router = express.Router()

router.post('/create', authenticateToken, formatBigIntResponse, withTaiwanTime, createBenefit)
router.get('/', authenticateToken, formatBigIntResponse, withTaiwanTime, getBenefit)
router.put('/:id', authenticateToken, formatBigIntResponse, withTaiwanTime, updateBenefit)


module.exports = router