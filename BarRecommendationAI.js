import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const bars = [
  {
    name: 'Draft Land',
    address: '台北市大安區忠孝東路四段248巷2號',
    latitude: 25.041927,
    longitude: 121.550537,
  },
  {
    name: 'Bar Mood Taipei',
    address: '台北市大安區敦化南路一段160巷53號',
    latitude: 25.041085,
    longitude: 121.550352,
  },
  {
    name: 'Indulge Bistro',
    address: '台北市大安區復興南路一段219巷11號',
    latitude: 25.039379,
    longitude: 121.544761,
  },
  {
    name: 'Wa-Shu 和酒',
    address: '台北市大安區忠孝東路四段101巷39號',
    latitude: 25.04358,
    longitude: 121.5484,
  },
  {
    name: 'Fake Sober Taipei',
    address: '台北市信義區松壽路20號',
    latitude: 25.035428,
    longitude: 121.567454,
  },
  {
    name: 'ABV Bar & Kitchen',
    address: '台北市大安區光復南路260巷39號',
    latitude: 25.040309,
    longitude: 121.555676,
  },
  {
    name: 'Barcode',
    address: '台北市信義區松壽路22號5樓',
    latitude: 25.035668,
    longitude: 121.567898,
  },
  {
    name: 'Alchemy Speakeasy',
    address: '台北市信義區信義路五段16-1號2樓',
    latitude: 25.032733,
    longitude: 121.563248,
  },
  {
    name: 'Revolver',
    address: '台北市中正區羅斯福路一段1-2號',
    latitude: 25.042545,
    longitude: 121.519878,
  },
  {
    name: '榕 RON Xinyi',
    address: '台北市信義區基隆路二段12號',
    latitude: 25.032415,
    longitude: 121.558898,
  },
  {
    name: 'GumGum Beer & Wings',
    address: '台北市信義區光復南路473巷11弄38號',
    latitude: 25.034186,
    longitude: 121.559192,
  },
  {
    name: 'Room by Le Kief',
    address: '台北市大安區和平東路三段68號1樓',
    latitude: 25.024556,
    longitude: 121.550156,
  },
  {
    name: '星夜 Starry night Bar',
    address: '台北市大同區長安西路89號',
    latitude: 25.051357,
    longitude: 121.516541,
  },
  {
    name: 'Muzeo Gastronomy&Draft',
    address: '台北市大安區忠孝東路四段170巷6弄14號',
    latitude: 25.041080,
    longitude: 121.550095,
  },
  {
    name: 'PUN',
    address: '台北市大安區信義路四段378巷5號1樓',
    latitude: 25.032905,
    longitude: 121.555818,
  }
];

const BarList = bars.map(bar => 
  `- ${bar.name}（地址：${bar.address}，經緯度：${bar.latitude}, ${bar.longitude}）`
).join('\n');

async function JoinBot() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `以下是台北的 15 間酒吧資料：\n${BarList}\n\n請根據這些資訊推薦幾家適合年輕人去的酒吧，並簡單說明原因。`,
          }
        ],
      },
    ],
    config: {
      systemInstruction: "你是一個專業的台北酒吧嚮導，擅長根據地點與使用者喜好的酒吧風格推薦合適的酒吧。"
    },
  });

  console.log(response.text);
}

await JoinBot();

