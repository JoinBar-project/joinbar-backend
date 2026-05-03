## ADDED Requirements

### Requirement: 取得單一酒吧詳情

系統 SHALL 提供公開端點 `GET /api/bars/:id`，回傳指定酒吧的完整資訊（含 BarTag）。

端點為公開路由（`@Public()`），無需 JWT。

回傳結構：

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "address": "...",
    "phone": "...",
    "website": "...",
    "imageUrl": "...",
    "latitude": 25.033,
    "longitude": 121.5654,
    "googlePlaceId": "...",
    "tags": ["sport", "music"],
    "createdAt": "...",
    "updatedAt": "..."
  },
  "timestamp": "..."
}
```

`tags` 欄位為 `BarTag` 中值為 `true` 的標籤名稱陣列。若該酒吧無 `BarTag` 記錄，回傳空陣列。

已軟刪除（`deletedAt IS NOT NULL`）的酒吧 SHALL 回傳 404。

#### Scenario: 正常取得

- **WHEN** `GET /api/bars/:id`，且該 id 存在且未刪除
- **THEN** 回傳 HTTP 200，`data.id` 等於請求 id

#### Scenario: 不存在的 id

- **WHEN** `GET /api/bars/:id`，該 id 不存在於資料庫
- **THEN** 回傳 HTTP 404

#### Scenario: 已軟刪除的酒吧

- **WHEN** `GET /api/bars/:id`，該酒吧 `deletedAt IS NOT NULL`
- **THEN** 回傳 HTTP 404
