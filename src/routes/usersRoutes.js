const express = require('express');
const router = express.Router();
const getAllUsers = require('../controllers/usersControllers');

router.get('/', authenticateToken, getAllUsers);
// router.get('/:id', getUserById);

module.exports = router;
