// routes/linePayRoutes.js
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
 createLinePayment
);

router.get('/confirm', 
 checkBasicSecurity,
 confirmLinePayment
);

router.get('/status/:orderId', 
 checkBasicSecurity,
 authenticateToken,
 logPaymentRequests,
 checkPaymentAccess,
 checkLinePaymentStatus
);

router.post('/refund/:orderId', 
 checkBasicSecurity,
 authenticateToken,
 logPaymentRequests,
 checkAdminRole,
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