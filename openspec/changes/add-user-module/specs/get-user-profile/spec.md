## ADDED Requirements

### Requirement: 查詢自己的 Profile

系統 SHALL 回傳目前登入使用者的完整 profile 資料。

#### Scenario: 正常查詢

- **WHEN** 已登入使用者呼叫 `GET /api/users/me`
- **THEN** 回傳 `{ id, email, username, nickname, role, birthday, avatarUrl, createdAt }` 且 HTTP 200

#### Scenario: 未登入

- **WHEN** 請求未帶有效 JWT
- **THEN** 回傳 HTTP 401
