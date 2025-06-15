const express = require('express');
const router = express.Router();
const validateSignup = require('../middlewares/validateSignup.js');
const { signup, login, verifyEmail, resendVerificationEmail } = require("../controllers/authControllers.js");

router.post("/signup", validateSignup, signup);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/login", login);

module.exports = router;