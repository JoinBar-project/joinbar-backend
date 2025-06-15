const express = require("express");
const router = express.Router();

const { addTagsToUser, getBarTagsFromUser, UpdateTagFromUser,recommendToUser } = require("../controllers/barTagControllers.js");

router.post("/preferences/:id", addTagsToUser);
router.get("/preferences/:id", getBarTagsFromUser);
router.put("/preferences/:id", UpdateTagFromUser);
router.post("/preferences/:id", recommendToUser);

module.exports = router;