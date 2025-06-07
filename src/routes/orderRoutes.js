const express = require('express');
const { 
  createOrder,
  getOrder,
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderControllers');

const router = express.Router();

router.post('/create', createOrder);
router.get('/:id', getOrder);
router.get('/:id/details', getOrderWithDetails);
router.put('/update-status/:id', updateOrderStatus);
router.delete('/:id', cancelOrder);

module.exports = router;