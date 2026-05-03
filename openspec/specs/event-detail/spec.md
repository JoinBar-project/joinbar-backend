## ADDED Requirements

### Requirement: 取得單一活動詳情

系統 SHALL 提供公開端點（GET /events/:id）回傳活動完整資料，包含標籤名稱陣列與已報名人數。若活動不存在或已軟刪除則回傳 404。

#### Scenario: 取得存在的活動

- **WHEN** 使用者呼叫 GET /events/:id，且該活動存在
- **THEN** 系統回傳 200 與活動詳情（含 tags 陣列與 participantCount）

#### Scenario: 活動不存在

- **WHEN** 使用者呼叫 GET /events/:id，且該 ID 不存在或已軟刪除
- **THEN** 系統回傳 404 EVENT_NOT_FOUND
