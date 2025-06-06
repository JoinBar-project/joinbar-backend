const express = require('express');
const { 
  createOrder,
  getOrder,
  testConnection
} = require('../controllers/orderControllers');

const router = express.Router();

router.get('/test', testConnection);
router.post('/create', createOrder);
router.get('/:id', getOrder);

module.exports = router;