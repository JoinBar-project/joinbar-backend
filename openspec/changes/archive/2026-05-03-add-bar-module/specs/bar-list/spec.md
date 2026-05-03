## ADDED Requirements

### Requirement: 列出酒吧（分頁 + 篩選）

系統 SHALL 提供公開端點 `GET /api/bars`，依查詢參數回傳酒吧分頁列表。

端點為公開路由（`@Public()`），無需 JWT。

Query 參數：

- `page`（integer，預設 1）
- `limit`（integer，預設取自 `DEFAULT_PAGE_LIMIT`，上限 100）
- `keyword`（string，可選）：對 `name`、`address` 做 case-insensitive 部分比對
- `tags`（string，可選，逗號分隔）：合法值為 `sport | music | student | bistro | drink | joy | romantic | oldschool | highlevel | easy`；多標籤取**聯集**（OR）

回傳結構：

```json
{
  "success": true,
  "data": {
    "items": [
      /* BarListItem[] */
    ],
    "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  },
  "timestamp": "..."
}
```

`BarListItem` 欄位：`id, name, address, phone, website, imageUrl, latitude, longitude, tags`

- `tags` 為 `BarTag` boolean 欄位展開為字串陣列（只列值為 `true` 的標籤）
- 已軟刪除（`deletedAt IS NOT NULL`）的酒吧 SHALL NOT 出現在列表

分頁計算使用 `getPagination` / `buildPaginationMeta`（`src/infrastructure/pagination.ts`）。

#### Scenario: 無篩選條件，回傳第一頁

- **WHEN** `GET /api/bars` 不帶任何 query 參數
- **THEN** 回傳 HTTP 200，`data.items` 為非刪除酒吧列表，`data.meta.page` 為 1

#### Scenario: 標籤篩選

- **WHEN** `GET /api/bars?tags=sport,music`
- **THEN** 回傳 HTTP 200，`data.items` 只包含 `BarTag.sport=true` 或 `BarTag.music=true` 的酒吧

#### Scenario: 關鍵字搜尋

- **WHEN** `GET /api/bars?keyword=台北`
- **THEN** 回傳 HTTP 200，`data.items` 只包含 `name` 或 `address` 包含「台北」的酒吧

#### Scenario: 無符合結果

- **WHEN** 篩選條件無任何酒吧符合
- **THEN** 回傳 HTTP 200，`data.items` 為空陣列，`data.meta.total` 為 0

#### Scenario: 非法 tags 值

- **WHEN** `GET /api/bars?tags=invalid`
- **THEN** 回傳 HTTP 400
