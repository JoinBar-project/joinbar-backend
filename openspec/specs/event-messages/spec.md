## ADDED Requirements

### Requirement: 列出活動留言

系統 SHALL 提供公開端點（GET /events/:id/messages），回傳該活動所有未軟刪除留言，依 `createdAt` 升冪排列。若活動不存在則回傳 404。

#### Scenario: 取得留言列表

- **WHEN** 呼叫 GET /events/:id/messages，活動存在
- **THEN** 系統回傳 200 與留言陣列（含 id、content、userId、createdAt）

#### Scenario: 活動不存在

- **WHEN** 呼叫 GET /events/:id/messages，活動 ID 不存在
- **THEN** 系統回傳 404 EVENT_NOT_FOUND

### Requirement: 發布留言

系統 SHALL 提供 POST /events/:id/messages 端點（需 JWT）。content 不得為空字串。若活動不存在則回傳 404。

#### Scenario: 成功發布留言

- **WHEN** 已登入使用者呼叫 POST /events/:id/messages 並提供非空 content
- **THEN** 系統回傳 201 與建立的留言資料

#### Scenario: content 為空

- **WHEN** 使用者傳入空字串 content
- **THEN** 系統回傳 400 VALIDATION_ERROR

#### Scenario: 未登入

- **WHEN** 未帶 JWT 呼叫 POST /events/:id/messages
- **THEN** 系統回傳 401

### Requirement: 刪除留言

系統 SHALL 提供 DELETE /events/:id/messages/:messageId 端點（需 JWT），執行軟刪除。只有留言本人或 ADMIN 才可刪除。

#### Scenario: 留言本人成功刪除

- **WHEN** 留言作者呼叫 DELETE /events/:id/messages/:messageId
- **THEN** 系統回傳 204，留言 deletedAt 被設定

#### Scenario: 非本人、非 ADMIN 嘗試刪除

- **WHEN** 其他已登入使用者呼叫 DELETE /events/:id/messages/:messageId
- **THEN** 系統回傳 403

#### Scenario: 留言不存在

- **WHEN** 呼叫 DELETE /events/:id/messages/:messageId 且留言 ID 不存在
- **THEN** 系統回傳 404 MESSAGE_NOT_FOUND
