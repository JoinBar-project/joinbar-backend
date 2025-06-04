const express = require("express");
const router = express.Router();

const { addTagsToBar, getBarTags, removeTagFromBar } = require("../controllers/barTagControllers.js");
const { route } = require("./tagsRoutes.js");
const { verifyToken, checkAdmin } = require("../middlewares/checkRole.js");
const { tags } = require("../models/schema.js");

router.post("/bars/:barId/tags", verifyToken, checkAdmin, addTagsToBar );
router.get("/bars/:barId/tags", getBarTags);
router.delete("/bars/:barId/tags/:tagId", verifyToken, checkAdmin, removeTagFromBar);

module.exports = router;