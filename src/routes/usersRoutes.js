const express = require('express');
const router = express.Router();
const getAllUsers = require('../controllers/usersControllers');

router.get('/', getAllUsers);
// router.get('/:id', getUserById);

module.exports = router;
