const express = require('express');
const router = express.Router();
const {
  getUserCart,
  addToCart,
  removeFromCart,
  clearCart
} = require('../controllers/cartControllers');
const authenticateToken = require('../middlewares/authenticateToken');

router.use(authenticateToken);
router.get('/', getUserCart);
router.post('/add', addToCart);
router.delete('/remove/:eventId', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;