const express = require('express');
const router = express.Router();
const {
 createLinePayment,
 confirmLinePayment,
 checkLinePaymentStatus
} = require('../controllers/linePayControllers');

const authenticateToken = require('../middlewares/authenticateToken');
const formatApiResponse = require('../middlewares/formatApiResponse'); 

const { 
 paymentRateLimit,
 validatePaymentData, 
 preventDuplicatePayment,
 checkPaymentAccess,
 logPaymentRequests,
 checkBasicSecurity
} = require('../middlewares/paymentSecurity');

router.post('/create', 
 checkBasicSecurity,
 paymentRateLimit,
 authenticateToken, 
 logPaymentRequests,
 validatePaymentData,
 preventDuplicatePayment,
 formatApiResponse,        
 createLinePayment
);

router.get('/confirm', 
 checkBasicSecurity,
 formatApiResponse,        
 confirmLinePayment
);

router.get('/status/:orderId', 
 checkBasicSecurity,
 authenticateToken,
 logPaymentRequests,
 checkPaymentAccess,
 formatApiResponse,        
 checkLinePaymentStatus
);

module.exports = router;