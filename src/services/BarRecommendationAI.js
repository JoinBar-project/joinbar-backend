require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');


class GeminiBarRecommender {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 尚未設定');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async recommendBars(userInput) {
    const bars = [
      { name: 'Draft Land', address: '台北市大安區忠孝東路四段248巷2號', latitude: 25.041927, longitude: 121.550537 ,mapsLink:'https://maps.app.goo.gl/aQNRe5H9n46TiVCK8' },
      { name: 'Bar Mood Taipei', address: '台北市大安區敦化南路一段160巷53號', latitude: 25.041085, longitude: 121.550352 ,mapsLink:'https://maps.app.goo.gl/VRTmFk1yQuSHYVRx6' },
      { name: 'Indulge Bistro', address: '台北市大安區復興南路一段219巷11號', latitude: 25.039379, longitude: 121.544761 ,mapsLink:'https://maps.app.goo.gl/sMAjDjRZ5vud7LeN9' },
      { name: 'Wa-Shu 和酒', address: '台北市大安區忠孝東路四段101巷39號', latitude: 25.04358, longitude: 121.5484 ,mapsLink:'https://maps.app.goo.gl/NgZxdiB9xiTHLdjN9' },
      { name: 'Fake Sober Taipei', address: '台北市信義區松壽路20號', latitude: 25.035428, longitude: 121.567454 ,mapsLink:'https://maps.app.goo.gl/eY3uSg2zFeg18dA47' },
      { name: 'ABV Bar & Kitchen', address: '台北市大安區光復南路260巷39號', latitude: 25.040309, longitude: 121.555676 ,mapsLink:'https://maps.app.goo.gl/4itoJJvc3KhfwYMe6' },
      { name: 'Barcode', address: '台北市信義區松壽路22號5樓', latitude: 25.035668, longitude: 121.567898  ,mapsLink:'https://maps.app.goo.gl/a5EiZQXZHvVoMhff9' },
      { name: 'Alchemy Speakeasy', address: '台北市信義區信義路五段16-1號2樓', latitude: 25.032733, longitude: 121.563248 ,mapsLink:'https://maps.app.goo.gl/zJzhTWgHHdhnZ1Vm6' },
      { name: 'Revolver', address: '台北市中正區羅斯福路一段1-2號', latitude: 25.042545, longitude: 121.519878 ,mapsLink:'https://maps.app.goo.gl/UpkWG9T74mSD7JdA7' },
      { name: '榕 RON Xinyi', address: '台北市信義區基隆路二段12號', latitude: 25.032415, longitude: 121.558898  ,mapsLink:'https://maps.app.goo.gl/WqboqEGaSKActGXd9' },
      { name: 'GumGum Beer & Wings', address: '台北市信義區光復南路473巷11弄38號', latitude: 25.034186, longitude: 121.559192 ,mapsLink:'https://maps.app.goo.gl/xeHdeKDeY8uqD6146' },
      { name: 'Room by Le Kief', address: '台北市大安區和平東路三段68號1樓', latitude: 25.024556, longitude: 121.550156 ,mapsLink:'https://maps.app.goo.gl/6yggPh5u3i9FroRZA' },
      { name: '星夜 Starry night Bar', address: '台北市大同區長安西路89號', latitude: 25.051357, longitude: 121.516541 ,mapsLink:'https://maps.app.goo.gl/bp9PYDRLRjByjNR39' },
      { name: 'Muzeo Gastronomy&Draft', address: '台北市大安區忠孝東路四段170巷6弄14號', latitude: 25.04108, longitude: 121.550095 ,mapsLink:'https://maps.app.goo.gl/3cR3kXAxtZUQXqGs8' },
      { name: 'PUN', address: '台北市大安區信義路四段378巷5號1樓', latitude: 25.032905, longitude: 121.555818 ,mapsLink:'https://maps.app.goo.gl/TrfZcHEmWhWX7pRM6' }
    ];

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
