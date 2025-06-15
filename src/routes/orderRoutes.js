const express = require('express');
const { 
  createOrder,
  getOrder,
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder,
  confirmPayment
} = require('../controllers/orderControllers');

const authenticateToken = require('../middlewares/authenticateToken');
const { checkOrderOwnership, checkAdminRole } = require('../middlewares/checkPermission');

const router = express.Router();

router.post('/create', authenticateToken, createOrder);
router.get('/:id', authenticateToken, checkOrderOwnership, getOrder);
router.get('/:id/details', authenticateToken, checkOrderOwnership, getOrderWithDetails);
router.put('/update-status/:id', authenticateToken, checkAdminRole, updateOrderStatus);
router.put('/confirm-payment/:id', authenticateToken, checkOrderOwnership, confirmPayment);
router.delete('/:id', authenticateToken, cancelOrder);

module.exports = router;