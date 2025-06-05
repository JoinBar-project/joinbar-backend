const express = require("express");
const router = express.Router();

const { addTagsToUser } = require("../controllers/barTagControllers.js");


router.post("/addTags", addTagsToUser);
// router.get("/bars/:barId/tags", getBarTags);
// router.delete("/bars/:barId/tags/:tagId", verifyToken, checkAdmin, removeTagFromBar);

module.exports = router;