const express = require('express');
const router = express.Router();
const {
 createLinePayment,
 confirmLinePayment,
 checkLinePaymentStatus,
 refundLinePayment
} = require('../controllers/linePayControllers');

const { handlePaymentWebhook, handleRefundWebhook } = require('../controllers/webhookControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const { checkAdminRole } = require('../middlewares/checkPermission');
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

router.post('/refund/:orderId', 
 checkBasicSecurity,
 authenticateToken,
 logPaymentRequests,
 checkAdminRole,
 formatApiResponse,        
 refundLinePayment
);

router.post('/webhook', 
 checkBasicSecurity,
 logPaymentRequests,
 handlePaymentWebhook
);

router.post('/webhook/refund', 
 checkBasicSecurity,
 logPaymentRequests,
 handleRefundWebhook
);

module.exports = router;