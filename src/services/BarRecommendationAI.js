require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bars = require('../data/BarList');

class GeminiBarRecommender {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 尚未設定');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async recommendBars(userInput) {

    const barList = bars.map(bar =>
      `- ${bar.name}（地址：${bar.address}，經緯度：${bar.latitude}, ${bar.longitude}, 地圖連結：${bar.mapsLink}）`
    ).join('\n');

    const prompt = `你是一位專業的台北酒吧推薦專家。

      以下是台北15間精選酒吧的詳細資料：${barList}

      使用者需求：${userInput}

      請根據使用者的需求，從上述酒吧中推薦2-3間最適合的酒吧，並說明推薦理由。

      回覆格式請完全按照以下範例：
      🍺 酒吧名稱<br>
      📍 <a href="酒吧對應的地圖連結" target="_blank">點擊導航</a><br>
      推薦理由（不超過兩行）<br>
      特色：簡短特色介紹<br><br>

      注意：
      1. 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），直接用純文字回覆即可。
      2. 1. 請使用我提供的正確 Google Maps 連結，並可以讓使用者直接點擊跳轉。

      請用輕鬆、開朗的語氣回覆，讓使用者感受到個人化的推薦服務。`;

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{
            text: `你是一個專業的酒吧嚮導，名為「JoinBot 酒吧小幫手」。
            你的任務：
            - 根據使用者的需求，從提供的15間酒吧中推薦最適合的2-3間
            - 提供簡短的推薦理由
            - 語氣要輕鬆、開朗，像是一位熟悉台北夜生活的在地朋友
            - 如果使用者需求不明確，可以適度詢問偏好來提供更好的推薦
            - 回覆要簡潔有用，避免過於冗長，每個推薦不超過兩行`
          }]
        }
      });

      // 正確抓出 Gemini 的文字回應
  const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.warn('AI 回傳空內容');
    return '目前無法取得推薦內容，請稍後再試。';
  }

  return text;
} catch (err) {
  console.error('Gemini 推薦錯誤：', err);
  throw new Error('無法取得 AI 推薦結果');
}
  }
}

module.exports = GeminiBarRecommender;
