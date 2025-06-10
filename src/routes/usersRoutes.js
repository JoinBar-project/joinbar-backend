const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById } = require('../controllers/usersControllers');
const authenticateToken = require('../middlewares/authenticateToken');

router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);

module.exports = router;
