## Context

auth / user / bar 模組已完成，Hexagonal 架構已確立：adapter/in → application → port/out ← adapter/out。`EventRecord`、`Tag`、`EventTag`、`EventParticipation`、`Message` schema 皆已存在，無需 migration。Tag 為獨立 model（多對多），與 BarTag 的 boolean 欄位不同。

## Goals / Non-Goals

**Goals:**

- 提供公開活動列表 / 詳情 API（無需登入）
- 提供 JWT 保護的 CRUD API（create 需 JWT；update/delete 限 ADMIN 或主辦人 hostUser）
- 提供 JWT 保護的報名 / 退出 API
- 提供活動留言板（列表公開，發布需 JWT，刪除限本人或 ADMIN）
- 提供 Tag 清單 API（公開，供篩選使用）

**Non-Goals:**

- 活動付費 / 訂單（由 order 模組處理）
- 活動收藏 / 資料夾（由 favorite 模組處理）
- 通知推送（由 notification 模組處理）
- Tag CRUD 管理（Tag 為靜態 seed 資料）

## Decisions

### D1：Tag 查詢放在 EventController 或獨立 TagController

選擇在同一個 `EventModule` 內新增 `/tags` 端點（由 `EventController` 或獨立 `TagController`），避免增加一個 module 配線。Tag 是活動的附屬概念，沒有獨立業務邏輯，統一在 EventModule 管理即可。

### D2：update / delete 授權策略

使用「ADMIN 或 hostUser === 當前使用者 ID」雙重條件。在 service 層做業務規則判斷（取出 event.hostUser 比對），不在 guard 層做，保持 guard 職責單一（only JWT validity）。若不符合條件拋 `ForbiddenException`。

### D3：EventTag 更新策略

與 BarTag upsert 類比，但 Tag 是獨立 model，需先 `findMany({ where: { name: { in: tagNames } } })` 取得 Tag ID，再 `deleteMany` + `createMany` 做整體覆寫。沿用 bar module 的「帶 tags 則整體覆寫」語意。

### D4：留言刪除策略

軟刪除（設定 `deletedAt`），與 EventRecord 一致。列表查詢過濾 `deletedAt: null`。

### D5：maxPeople 報名上限檢查

`JoinEventService` 在報名前用 `COUNT(EventParticipation WHERE eventId)` 比對 `maxPeople`，若 maxPeople 為 null 則不限制。並發衝突由 DB unique constraint（`@@unique([userId, eventId])`）兜底，重複報名回傳 409。

## Risks / Trade-offs

- [Tag 為靜態資料] → Tag 需在 DB seed 階段預先建立，service 層用名稱查 ID，若 tag name 不存在則拋 BadRequest。
- [並發超額報名] → 先 count 再 create 有 TOCTOU 問題；maxPeople 限制是 best-effort，不做悲觀鎖定，接受輕微超額。
- [留言無分頁] → 初版採無限滾動（全量回傳），若留言數量大後續需補分頁。

## Migration Plan

Schema 已存在，無需 DB migration。部署順序：build → start（與其他模組相同）。
