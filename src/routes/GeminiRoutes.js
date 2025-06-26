const express = require('express');
const router = express.Router();

const GeminiBarRecommender = require('../services/BarRecommendationAI');
const recommender = new GeminiBarRecommender();

// 聊天 API 使用者輸入
router.post('/recommendAI', async (req, res) => {
    const { message } = req.body
  if (!message || message.trim() === '') {
    return res.status(400).json({ success: false, message: '缺少輸入內容' })
  }

  try {
    const result = await recommender.recommendBars(message)
    res.json({ success: true, result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router;
