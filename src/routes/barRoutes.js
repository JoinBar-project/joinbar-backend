const express = require("express");
const router = express.Router();
const barController = require("../controllers/barController");

// 獲取酒吧列表的路由
router.get("/bars", /* authMiddleware, */ barController.getBars);
router.post("/bars", /* authMiddleware, */ barController.createBar);

module.exports = router;
