const express = require('express');
const { 
  createOrder,
  getOrder,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderControllers');

const router = express.Router();

router.post('/create', createOrder);
router.get('/:id', getOrder);
router.put('/update-status/:id', updateOrderStatus);
router.delete('/:id', cancelOrder);

module.exports = router;