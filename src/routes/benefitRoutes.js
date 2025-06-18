const express = require('express')
const { createBenefit, getBenefitList, updateBenefit } = require('../controllers/benefitControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatApiResponse = require('../middlewares/formatApiResponse');


const router = express.Router()

router.post('/create', authenticateToken, formatApiResponse, createBenefit)
router.get('/', authenticateToken, formatApiResponse, getBenefitList)
router.put('/status', authenticateToken, formatApiResponse, updateBenefit)


module.exports = router