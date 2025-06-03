// CORS 用來控制哪些前端網域可以存取你的後端 API origin => 請求來源
const corsOptions = {
	origin: function(origin, callback) {
		// 他會變成一個陣列 下面會去比對會端連線的網址請求
		const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
			'http://localhost:3000',  // Vue 開發服務器或前端
      'http://localhost:5173',  // Vite 開發服務器
      'http://127.0.0.1:3000',  // 本地 IP
      'http://127.0.0.1:5173'  // 本地 Vite IP
		];

		// 允許沒有 origin 的請求 Postman、Insomnia 等工具發送的請求通常沒有 origin header
		if(!origin) {
    return callback(null, true)
    };

		// -1代表沒有符合我設定可以連線進來的網址
		if(allowedOrigins.indexOf(origin) !== -1) {
			// !== -1 表示「不等於 -1」，也就是「有找到符合的網址」
      callback(null, true);
			// 第一個參數：null (沒有錯誤)
      // 第二個參數：true (允許這個請求)
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'))
			// 這邊callback的false可以省略
    }
	},

	// 允許的 HTTP 方法
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],

	// 允許的請求頭 缺少會被cors拒絕連線
	allowedHeaders: [
  'Origin',           // 請求來源
  'X-Requested-With', // AJAX 請求標識
  'Content-Type',     // 內容類型 (application/json)
  'Accept',           // 接受的響應格式 Accept: application/json, text/plain, */* 告訴伺服器客戶端能接受什麼格式的回應
  'Authorization',    // 認證令牌 (Bearer token) JWT token, API key
  'Cache-Control'     // 緩存控制
  ],

	// 允許發送認證信息 (cookies, Authorization header)
  credentials: true,

	// 預檢請求緩存時間
  maxAge: 86400 // 24 hours
};

module.exports = { corsOptions };