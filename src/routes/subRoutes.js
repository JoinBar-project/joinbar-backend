const express = require('express')
const { getSupscription } = require('../controllers/eventControllers');
const authenticateToken = require('../middlewares/authenticateToken')

const router = express.Router()

router.get('/', authenticateToken, getSupscription)

module.exports = router