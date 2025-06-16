const express = require("express");
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');

const { addTagsToUser, getBarTagsFromUser, updateTagsFromUser } = require("../controllers/barTagControllers.js");

// router.use(authenticateToken);

router.post("/user/:id", addTagsToUser);
router.get("/user/:id", getBarTagsFromUser);
router.put("/user/:id", updateTagsFromUser);
// router.post("/user/:id", recommendToUser);

module.exports = router;