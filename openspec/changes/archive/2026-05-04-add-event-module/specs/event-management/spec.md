## ADDED Requirements

### Requirement: 建立活動

系統 SHALL 提供 POST /events 端點（需 JWT），允許任何已登入使用者建立活動。`hostUser` 自動設為當前使用者 ID，`barName` 若提供 `barId` 則自動從 Bar 查詢填入，否則使用傳入的 `barName`。若提供 `tags` 則建立對應 EventTag 記錄（tag name 不存在則 400）。

#### Scenario: 成功建立活動

- **WHEN** 已登入使用者呼叫 POST /events 並提供必填欄位（name、location、startAt、endAt）
- **THEN** 系統回傳 201 與建立後的活動資料（含 id、tags）

#### Scenario: 缺少必填欄位

- **WHEN** 使用者呼叫 POST /events 未提供 name
- **THEN** 系統回傳 400 VALIDATION_ERROR

#### Scenario: 未登入

- **WHEN** 未帶 JWT 呼叫 POST /events
- **THEN** 系統回傳 401

### Requirement: 更新活動

系統 SHALL 提供 PATCH /events/:id 端點（需 JWT）。只有 ADMIN 或 hostUser === 當前使用者 才可更新。至少需提供一個欄位。若提供 `tags` 則整體覆寫 EventTag。

#### Scenario: 主辦人成功更新

- **WHEN** 活動主辦人呼叫 PATCH /events/:id 並提供部分欄位
- **THEN** 系統回傳 200 與更新後活動資料

#### Scenario: 非主辦人、非 ADMIN 嘗試更新

- **WHEN** 其他已登入使用者呼叫 PATCH /events/:id
- **THEN** 系統回傳 403

#### Scenario: 活動不存在

- **WHEN** 呼叫 PATCH /events/:id 且 ID 不存在
- **THEN** 系統回傳 404 EVENT_NOT_FOUND

### Requirement: 刪除活動

系統 SHALL 提供 DELETE /events/:id 端點（需 JWT），執行軟刪除（設定 deletedAt）。只有 ADMIN 或 hostUser === 當前使用者 才可刪除。

#### Scenario: 主辦人成功刪除

- **WHEN** 活動主辦人呼叫 DELETE /events/:id
- **THEN** 系統回傳 204，活動 deletedAt 被設定

#### Scenario: 非主辦人、非 ADMIN 嘗試刪除

- **WHEN** 其他已登入使用者呼叫 DELETE /events/:id
- **THEN** 系統回傳 403

#### Scenario: 活動不存在

- **WHEN** 呼叫 DELETE /events/:id 且 ID 不存在
- **THEN** 系統回傳 404 EVENT_NOT_FOUND
