# JoinBar
這裡是 JoinBar 後端倉庫

### 後端使用套件
- PostgreSQL：資料庫
- bcrypt：密碼加密
- jsonwebtoken：JWT 身份驗證
- flake-idgen：生成唯一識別碼
- zod：資料驗證與型別檢查
- forker：假資料產生工具（使用 forker generate）

---

### 安裝與執行
執行前請確認有安裝 Node.js

1. 將專案 clone 下來 與 安裝
```
git clone https://github.com/JoinBar-project/joinbar-backend.git
cd 專案資料夾
npm install
npm run dev
```

2. 設定環境變數
請在根目錄建立 `.env` 檔案，填入資料庫連線資訊與密鑰
```
DATABASE_URL=postgres://user:password@localhost:5432/your-db
JWT_SECRET=your-secret
```

2. 生成資料表 schema 並遷移
```
npm run generate
npm run migrate
```

3. 生成假資料（可選）
```
npm run fake
```

4. 啟動專案
```
npm run start
```

