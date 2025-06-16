const express = require('express')
const { createRedeems } = require('../controllers/redeemsControllers');
const authenticateToken = require('../middlewares/authenticateToken')
const withTaiwanTime = require('../middlewares/withTaiwanTime')
const formatBigIntResponse = require('../middlewares/formatBigIntResponse');


const router = express.Router()

router.post('/', authenticateToken, formatBigIntResponse, withTaiwanTime, createRedeems)

module.exports = router