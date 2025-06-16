const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JoinBar API 文件手冊',
      version: '1.0.0',
      description: `
      這是「JoinBar」的 RESTful API 文件。
      JoinBar 是一個以地圖為核心的酒吧社交平台，結合會員互動、活動揪團與金流購物等功能，提供完整的夜生活交流體驗。

      說明：
      這是一個酒吧地圖社交平台

      主要功能：
      
      👤 會員系統
      - 使用者註冊、登入（支援第三方登入）
      - 會員收藏酒吧
      - 會員追蹤功能（可追蹤其他用戶）
 
       
      🍸 酒吧地圖
      - 地圖搜尋酒吧與多條件篩選
      - GPS 定位功能
      - 酒吧依特色分類呈現
      - 酒吧資訊卡：可收藏、分享

      🤝 揪團活動
      - 會員或平台方發起活動
      - 提供活動留言板，提升互動性
      - 可報名／取消報名活動

      💰 金流系統
      - 支援綠界與 LINE Pay 支付
      - 提供購物車功能（可一次結帳多個活動）
      - 加入訂閱制，提供進階會員服務

      📘 文件維護：
      - API 文件版本：v1.0
      - 最後更新：2025/06/11
      - 作者：JoinBar
      
      🔗 其他連結：
      [GitHub Repo](https://github.com/JoinBar-project)
      `
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ 
      bearerAuth: [] 
    }], 
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;