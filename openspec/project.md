# 專案：joinbar-backend

台灣酒吧社交平台的後端 API，提供使用者探索酒吧、參加活動、訂閱方案及 LINE Pay 付款等功能。

此檔案會在每次 OpenSpec 變更提案時作為背景資料載入，請保持內容更新。

---

## 功能範圍

- **認證**：Email/密碼 註冊與登入、LINE OAuth、Google（Firebase）OAuth、Email 驗證、JWT Refresh Token
- **使用者**：個人資料管理、頭像上傳（Firebase Storage）、偏好標籤
- **酒吧**：列表、標籤篩選、Google Maps 整合、Gemini AI 推薦
- **活動**：建立/編輯活動、標籤、參加者管理、留言板
- **訂單**：訂單管理、LINE Pay 結帳
- **購物車**：活動加入購物車
- **訂閱**：訂閱方案管理
- **優惠**：訂閱者優惠券建立與兌換
- **收藏**：酒吧/活動收藏，支援資料夾分類
- **通知**：使用者通知系統

---

## 技術棧

| 層面       | 選擇                                                          |
| ---------- | ------------------------------------------------------------- |
| 執行環境   | Node.js 20+                                                   |
| 框架       | NestJS 11 + Express 5                                         |
| 語言       | TypeScript 5（strict）                                        |
| ORM        | Prisma 7（PostgreSQL）                                        |
| 資料庫     | PostgreSQL                                                    |
| 驗證       | Zod（request DTOs）                                           |
| 認證       | JWT（`@nestjs/jwt`）+ bcrypt + LINE OAuth + Firebase Admin    |
| 付款       | LINE Pay                                                      |
| AI         | Google Gemini API（酒吧推薦）                                 |
| 圖片儲存   | Firebase Storage + Multer                                     |
| 郵件       | Nodemailer                                                    |
| API 文件   | Swagger / OpenAPI 3                                           |
| 測試       | Jest 29（單元 + E2E via `supertest`）                         |
| 套件管理   | npm                                                           |

---

## 架構 — 六邊形架構（Ports & Adapters）

```
src/
├── adapter/
│   ├── in/web/        # Controllers、DTOs、guards、filters、decorators、interceptors
│   └── out/           # Persistence（Prisma）、firebase、line-auth、line-pay、gemini、mail adapters
├── application/
│   ├── facade/        # 應用層對外公開介面（每個 domain 一個 Facade）
│   ├── port/
│   │   ├── in/        # Use case 介面
│   │   └── out/       # Repository / 外部服務介面
│   └── service/       # Use case 實作
├── domain/
│   ├── model/         # Domain entities
│   ├── value-object/  # Value objects
│   └── exception/     # Domain 業務例外（純 Error 子類別）
├── infrastructure/
│   └── prisma/        # PrismaModule、PrismaService
└── modules/           # NestJS module 接線（每個 domain 一個 .module.ts）
```

依賴方向：`adapter/in` → `application` → `port/out` ← `adapter/out`。
`application` 與 `domain` 層絕不 import `adapter`。

---

## Domain 模組

| 模組       | Facade                | 說明                                               |
| ---------- | --------------------- | -------------------------------------------------- |
| auth       | `AuthFacade`          | Email/LINE/Google 登入、JWT、Email 驗證            |
| user       | `UserFacade`          | 個人資料、頭像、偏好標籤                           |
| bar        | `BarFacade`           | 列表、標籤篩選、Google Maps、Gemini AI             |
| event      | `EventFacade`         | CRUD、標籤、參加者、留言板                         |
| order      | `OrderFacade`         | 訂單生命週期、LINE Pay 整合                        |
| cart       | `CartFacade`          | 活動購物車                                         |
| subscription | `SubscriptionFacade` | 訂閱方案                                          |
| benefit    | `BenefitFacade`       | 優惠券建立與兌換                                   |
| favorite   | `FavoriteFacade`      | 酒吧/活動收藏與資料夾                              |
| notification | `NotificationFacade` | 使用者通知記錄                                    |

---

## 環境變數

主要變數：`DATABASE_URL`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINEPAY_CHANNEL_ID`、`LINEPAY_CHANNEL_SECRET`、`FIREBASE_*`、`GEMINI_API_KEY`、`SMTP_*`、`CORS_ORIGIN`。
