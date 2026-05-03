## Why

JoinBar 的核心價值是讓使用者在酒吧舉辦與參加活動，目前 auth / user / bar 模組已就緒，需要補上 event 模組才能讓前端展示活動列表、報名、以及在活動下留言。

## What Changes

- **新增** Event 列表與詳情公開 API（不需登入）
- **新增** Event CRUD 管理 API（需 JWT，限 ADMIN 或活動主辦人）
- **新增** Event 報名 / 退出 API（需 JWT）
- **新增** Event 留言板 API（列表公開；發布 / 刪除需 JWT）
- **新增** Tag 查詢 API（取得可用標籤清單，供前端篩選使用）

## Capabilities

### New Capabilities

- `event-list` — 活動列表：分頁、關鍵字 / 標籤 / 日期範圍 / barId 篩選
- `event-detail` — 單一活動詳情（含標籤、參加人數）
- `event-management` — 活動 CRUD（create / update / softDelete）；create 需 JWT，update / delete 限 ADMIN 或主辦人
- `event-participation` — 報名（join）/ 退出（leave）活動；需 JWT
- `event-messages` — 活動留言板：列表公開、發布需 JWT、刪除限留言本人或 ADMIN

### Modified Capabilities

（無）

## Impact

- **新增檔案**：`src/domain/model/event.ts`、`src/domain/exception/EventNotFoundException.ts`、port/in 5 + participation 2 + message 2 個 use case、port/out FindEventPort / SaveEventPort / FindTagPort / SaveMessagePort、PrismaEventRepository、PrismaMessageRepository、EventService × 9、EventFacade、EventController + DTOs、EventModule
- **修改檔案**：`src/app.module.ts`（注入 EventModule）、`GlobalExceptionFilter`（EventNotFoundException → 404、MessageNotFoundException → 404）、`docs/swagger/openapi.yaml`（新增 /events / /events/{id} / /tags 路徑）
- **資料庫模型（唯讀參考）**：`EventRecord`、`Tag`、`EventTag`、`EventParticipation`、`Message`（schema 已存在，無需 migration）
- **無 breaking change**
