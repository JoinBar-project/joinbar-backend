const express = require('express');
const router = express.Router();

// const GeminiService = require('../services/GeminiService');
const GeminiBarRecommender = require('../services/BarRecommendationAI');

// const geminiService = new GeminiService();
const recommender = new GeminiBarRecommender();

// 聊天 API
// router.post('/chat/gemini', async (req, res) => {
//   try {
//     const userMessage = req.body.message;

//     if (!userMessage) {
//       return res.status(400).json({ error: 'User message is required' });
//     }

//     if (!geminiService.isConfigured()) {
//       return res.status(500).json({ error: 'Gemini API Key not configured' });
//     }

//     const reply = await geminiService.chat(userMessage);
//     res.json({ reply });

//   } catch (error) {
//     console.error('Gemini API Error:', error);
//     res.status(500).json({ error: 'An error occurred with Gemini API' });
//   }
// });

// 酒吧推薦 API
router.get('/recommend', async (req, res) => {
  const recommender = new GeminiBarRecommender();

  try {
    const result = await recommender.recommendBars();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
