## ADDED Requirements

### Requirement: 列出活動

系統 SHALL 提供公開活動列表端點（GET /events），支援分頁、關鍵字、標籤、日期範圍與 barId 篩選。只回傳 `deletedAt IS NULL` 的活動，依 `startAt` 升冪排列。

#### Scenario: 取得全部活動（無篩選）

- **WHEN** 使用者呼叫 GET /events 不帶任何參數
- **THEN** 系統回傳 200 與分頁活動列表（items + meta）

#### Scenario: 關鍵字篩選

- **WHEN** 使用者帶 `keyword=bar` 查詢
- **THEN** 系統僅回傳 name 或 location 包含 "bar"（case-insensitive）的活動

#### Scenario: 標籤篩選

- **WHEN** 使用者帶 `tags=music,sport` 查詢
- **THEN** 系統回傳至少包含其中一個標籤的活動（OR 語意）

#### Scenario: 日期範圍篩選

- **WHEN** 使用者帶 `startFrom=2024-01-01&startTo=2024-12-31` 查詢
- **THEN** 系統僅回傳 startAt 在該範圍內的活動

#### Scenario: barId 篩選

- **WHEN** 使用者帶 `barId=<uuid>` 查詢
- **THEN** 系統僅回傳屬於該酒吧的活動

#### Scenario: 分頁參數

- **WHEN** 使用者帶 `page=2&limit=5` 查詢
- **THEN** 系統回傳第 2 頁（每頁 5 筆）及正確的 pagination meta

### Requirement: 取得可用標籤清單

系統 SHALL 提供公開端點（GET /tags）回傳所有 Tag 記錄（id + name），供前端渲染篩選選項。

#### Scenario: 取得標籤列表

- **WHEN** 使用者呼叫 GET /tags
- **THEN** 系統回傳 200 與所有 Tag（id、name）
