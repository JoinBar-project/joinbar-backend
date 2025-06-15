const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/authControllers.js');
const validateSignup = require('../middlewares/validateSignup.js');

router.post('/signup', validateSignup, signup);
router.post('/login', login);

module.exports = router;
