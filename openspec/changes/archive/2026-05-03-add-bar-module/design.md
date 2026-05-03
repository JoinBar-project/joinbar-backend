## Context

Prisma schema 已有 `Bar`、`BarTag` 模型。`Bar` 紀錄酒吧基本資訊（名稱、地址、電話、網址、圖片、座標、Google Place ID）；`BarTag` 以 10 個 boolean 欄位記錄風格標籤，與 `Bar` 為 1:1 關係（同 barId 主鍵）。平台需提供公開瀏覽端點（無需登入）與管理端點（需 JWT），以及 Gemini AI 生成酒吧描述的功能（受 feature flag 控制）。

---

## Goals / Non-Goals

**Goals**

- 公開可讀的酒吧列表（標籤篩選 + 關鍵字搜尋 + 分頁）
- 公開可讀的單一酒吧詳情（含 BarTag）
- JWT 保護的酒吧 CRUD（含 BarTag upsert）
- Gemini AI 依酒吧資料生成描述文字
- 沿用 `src/infrastructure/pagination.ts`（`getPagination` / `buildPaginationMeta`）

**Non-Goals**

- 酒吧圖片上傳（imageUrl 由外部 URL 傳入，不走 Firebase Storage）
- 收藏（BarFavorite / BarFolder）由獨立 favorite 模組處理
- Google Places API 同步（seed 腳本範疇，不在此模組）

---

## Decisions

### 1. 公開端點與管理端點的存取控制

`GET /bars`、`GET /bars/:id` 加 `@Public()` decorator，讓未登入使用者可瀏覽酒吧。

管理操作（POST / PATCH / DELETE）須同時通過：

- class-level `@UseGuards(JwtAuthGuard)` — 驗身份（JWT 有效）
- method-level `@UseGuards(RolesGuard)` + `@Roles(RoleName.ADMIN)` — 驗角色（ADMIN only）

未帶 JWT 回傳 401；JWT 有效但非 ADMIN 回傳 403。

**替代方案**：獨立 PublicBarController + AuthBarController → 兩個 controller 增加維護成本，不採用。

### 2. BarTag 與 Bar 一起建立/更新（upsert）

建立酒吧時可選附帶 BarTag；更新時若帶 `tags` 欄位則執行 `upsert`，未帶則不動。
避免拆成兩支 API 增加前端複雜度。

### 3. GeminiPort 放 port/out/shared/

Gemini AI 能力跨模組共用（未來 event 推薦等也可使用），與 `FileStoragePort`、`SendEmailPort` 同層級。

### 4. ListBarsUseCase 使用 offset 分頁

沿用 `getPagination` + `buildPaginationMeta`，回傳 `{ items, meta }` 格式與其他模組一致。cursor 分頁留給未來大資料量時再評估。

### 5. Gemini 失敗回傳 503

`geminiEnabled=false` 或 Gemini API 呼叫失敗（timeout / API error）統一拋 `ServiceUnavailableException`，不 fallback 到空字串，讓前端明確知道服務不可用。

---

## Risks / Trade-offs

| 風險                                                 | 緩解                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gemini API key 未設定時呼叫 → runtime error          | GeminiAdapter.onModuleInit 若 key 為空則 warn log 並將 client 設為 null；generate() 被呼叫時拋 Error，由 AiDescribeBarService catch 轉為 503，應用仍正常啟動 |
| BarTag 為 1:1 關係，upsert 時需注意 onDelete Cascade | 刪除 Bar 時 BarTag 自動隨之刪除（schema 已設 Cascade），無需額外處理                                                                                         |
| 列表查詢無 Bar 資料時回傳空陣列 vs 404               | 永遠回傳 200 + 空陣列，符合 REST 慣例                                                                                                                        |

---

## Migration Plan

1. 部署新程式碼（無 schema 異動，不需 migration）
2. 設定環境變數 `APPLICATION_GEMINI_ENABLED=true` 及 `GEMINI_API_KEY` 以啟用 AI 功能（選用）
3. 無 rollback 風險（純新增端點）

---

## Open Questions

- 列表是否需要依距離排序（需前端傳入使用者座標）？（延後）
