## ADDED Requirements

### Requirement: 更新個人資料

系統 SHALL 接受 `PATCH /api/users/me`，更新使用者的 username、nickname、birthday（三個欄位皆為可選）。

#### Scenario: 成功更新

- **WHEN** 已登入使用者提交至少一個有效欄位
- **THEN** 更新 `UserRecord`，回傳更新後的 profile（同 GetUserProfile 格式）且 HTTP 200

#### Scenario: username 為空字串

- **WHEN** 提交 `username: ""`（空字串）
- **THEN** 回傳 HTTP 400，username 不更新

#### Scenario: 所有欄位皆未提供

- **WHEN** 請求 body 為空物件 `{}`
- **THEN** 回傳 HTTP 400
