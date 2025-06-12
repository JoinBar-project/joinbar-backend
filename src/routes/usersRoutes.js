const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, patchUserById } = require('../controllers/usersControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const validateUpdateUserData = require('../middlewares/validateUpdateUserData');

router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);
router.patch('/:id', authenticateToken, validateUpdateUserData, patchUserById);

module.exports = router;
