const express = require('express');
const {
  getBenefitList,
  updateBenefit,
} = require('../controllers/benefitControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const formatApiResponse = require('../middlewares/formatApiResponse');

const router = express.Router();

router.get('/', authenticateToken, formatApiResponse, getBenefitList);
router.put('/status', authenticateToken, formatApiResponse, updateBenefit);

module.exports = router;
