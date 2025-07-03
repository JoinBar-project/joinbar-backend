# JoinBar-backend

### 後端使用的工具 / 套件
- PostgreSQL：資料庫
- bcrypt：密碼加密
- jsonwebtoken：JWT 身份驗證
- flake-idgen：生成唯一識別碼
- zod：資料驗證與型別檢查
- @faker-js/faker：假資料產生工具
- @google/generative-ai：Gemini AI 串接
- firebase storage：圖片雲端儲存
- nodemailer：寄送註冊驗證信
- swagger：API 文件說明

---

### 安裝與執行

執行前請確認已安裝 Node.js

1. 專案下載及安裝
```
git clone https://github.com/JoinBar-project/joinbar-backend.git
cd joinbar-backend
npm install
npm run dev
```

2. 設定環境變數
在專案根目錄下建立 `.env` 檔案，並依照 `.env.template` 範例填入變數，例如：
```
# 資料庫連線字串（PostgreSQL）
DATABASE_URL=postgres://user:password@localhost:5432/your-database
```

3. 生成資料表 schema 並進行遷移
```
npm run generate
npm run migrate
```

4. 生成假資料（可選）
產生 1 位管理者及 10 位會員：
```
npm run seed
```
在 `tags Table` 中，新增以下 6 筆活動特色標籤：
```sql
INSERT INTO public.tags (id, name) VALUES
  (1, '免費活動'),
  (2, '限時報名'),
  (3, '單身限定'),
  (4, '週末來喝'),
  (5, '主題之夜'),
  (6, '現場LIVE');
```
建立活動資料：
```
npm run seed-events (產生活動)
```

5. 啟動專案
```
npm run start
```

### 組員分工

| 組員     | GitHub                                                 | 實現功能|
|----------|-------------------------------------------------------|------------|
| 卓訢妤   | [2xin15](https://github.com/2xin15)                    | 1. 酒吧偏好與標籤資料庫建置 <br> 2. 酒吧標籤後端 API 設計及 CRUD <br> 3. 導入 Gemini AI 實現智慧酒吧推薦系統|
| 鄭婉君   | [Bella-Cheng](https://github.com/Bella-Cheng)          | 1. 後端環境建構 <br> 2. 活動資料庫建置 <br> 3. 活動後端 API 設計及 CRUD <br> 4. 訂閱、優惠券串接金流 <br> 5. 訂閱、優惠券後端 API 設計及 CRUD |
| 紀雅馨   | [rakku2code](https://github.com/rakku2code)            | 1. 取得所有活動的 API <br> 2. 上傳及更換活動圖片功能 |
| 陳紫婷   | [jasminecchen](https://github.com/jasminecchen)        | 1. 會員資料表建置 <br> 2. 註冊登入及會員資料後端 API <br> 3. 會員個人資料及頭像串接  |
| 戎彬     | [Benjung1215](https://github.com/Benjung1215)          | 1. 訂單前後端 API 串接 <br> 2. Line Pay 串接 <br> 3. 購物車後端 API 設計 |
| 蔡昌成   | [kirito489](https://github.com/kirito489)              | 1. 註冊登入前端邏輯串接 Pinia store 設計 <br> 2. 驗證信功能實作與重發冷卻機制 <br> 3. 第三方登入後端api設計 |
| 竇孝武   | [DouFreddy](https://github.com/DouFreddy)            | 1. 串接酒吧資料庫與收藏頁面 API |
