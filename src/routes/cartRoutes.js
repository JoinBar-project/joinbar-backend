const express = require('express');
const router = express.Router();
const {
  getUserCart,
  addToCart,
  removeFromCart,
  clearCart
} = require('../controllers/cartControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const formatApiResponse = require('../middlewares/formatApiResponse');

router.use(authenticateToken);
router.get('/', formatApiResponse, getUserCart);  
router.post('/add', formatApiResponse, addToCart); 
router.delete('/remove/:eventId', formatApiResponse, removeFromCart);  
router.delete('/clear', formatApiResponse, clearCart); 

module.exports = router;