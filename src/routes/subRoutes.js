const express = require('express')
const { createSubscription, getAllPlans, getPlan } = require('../controllers/subscriptionControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const formatApiResponse = require('../middlewares/formatApiResponse');


const router = express.Router()

router.post('/', authenticateToken, formatApiResponse, createSubscription)
router.get('/allPlans', formatApiResponse, getAllPlans)
router.get('/plan', authenticateToken, formatApiResponse, getPlan)

module.exports = router