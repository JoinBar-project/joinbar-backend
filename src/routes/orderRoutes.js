const express = require('express');
const { 
  createOrder,
  getOrder,
  updateOrderStatus,
  testConnection
} = require('../controllers/orderControllers');

const router = express.Router();

router.get('/test', testConnection);
router.post('/create', createOrder);
router.get('/:id', getOrder);
router.put('/update-status/:id', updateOrderStatus);

module.exports = router;