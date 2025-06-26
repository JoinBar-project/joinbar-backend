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

  async recommendBars() {
    const bars = [
      { name: 'Draft Land', address: '台北市大安區忠孝東路四段248巷2號', latitude: 25.041927, longitude: 121.550537 },
      { name: 'Bar Mood Taipei', address: '台北市大安區敦化南路一段160巷53號', latitude: 25.041085, longitude: 121.550352 },
      { name: 'Indulge Bistro', address: '台北市大安區復興南路一段219巷11號', latitude: 25.039379, longitude: 121.544761 },
      { name: 'Wa-Shu 和酒', address: '台北市大安區忠孝東路四段101巷39號', latitude: 25.04358, longitude: 121.5484 },
      { name: 'Fake Sober Taipei', address: '台北市信義區松壽路20號', latitude: 25.035428, longitude: 121.567454 },
      { name: 'ABV Bar & Kitchen', address: '台北市大安區光復南路260巷39號', latitude: 25.040309, longitude: 121.555676 },
      { name: 'Barcode', address: '台北市信義區松壽路22號5樓', latitude: 25.035668, longitude: 121.567898 },
      { name: 'Alchemy Speakeasy', address: '台北市信義區信義路五段16-1號2樓', latitude: 25.032733, longitude: 121.563248 },
      { name: 'Revolver', address: '台北市中正區羅斯福路一段1-2號', latitude: 25.042545, longitude: 121.519878 },
      { name: '榕 RON Xinyi', address: '台北市信義區基隆路二段12號', latitude: 25.032415, longitude: 121.558898 },
      { name: 'GumGum Beer & Wings', address: '台北市信義區光復南路473巷11弄38號', latitude: 25.034186, longitude: 121.559192 },
      { name: 'Room by Le Kief', address: '台北市大安區和平東路三段68號1樓', latitude: 25.024556, longitude: 121.550156 },
      { name: '星夜 Starry night Bar', address: '台北市大同區長安西路89號', latitude: 25.051357, longitude: 121.516541 },
      { name: 'Muzeo Gastronomy&Draft', address: '台北市大安區忠孝東路四段170巷6弄14號', latitude: 25.04108, longitude: 121.550095 },
      { name: 'PUN', address: '台北市大安區信義路四段378巷5號1樓', latitude: 25.032905, longitude: 121.555818 }
    ];

    const barList = bars.map(bar =>
      `- ${bar.name}（地址：${bar.address}，經緯度：${bar.latitude}, ${bar.longitude}）`
    ).join('\n');

    const prompt = `以下是台北的 15 間酒吧資料：\n${barList}\n\n請根據這些資訊推薦幾家適合年輕人去的酒吧，並簡單說明原因。`;

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
            text: '你是一個專業的酒吧嚮導，擅長根據地點與使用者喜歡的酒吧風格推薦合適的酒吧。'
          }]
        }
      });

      // 改這段：正確抓出 Gemini 的文字回應
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


if (require.main === module) {
  const recommender = new GeminiBarRecommender();
  recommender.recommendBars()
    .then(result => {
      console.log('推薦結果：\n', result);
    })
    .catch(err => {
      console.error('發生錯誤：', err.message);
    });
}
module.exports = GeminiBarRecommender;
