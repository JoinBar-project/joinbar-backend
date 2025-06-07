const express = require("express");
const router = express.Router();

const { addTagsToUser, getBarTagsFromUser, UpdateTagFromUser } = require("../controllers/barTagControllers.js");

router.post("/:id/preferences", addTagsToUser);
router.get("/:id/preferences", getBarTagsFromUser);
router.put("/:id/preferences", UpdateTagFromUser);

module.exports = router;