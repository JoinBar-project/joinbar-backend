## ADDED Requirements

### Requirement: 刪除頭像

系統 SHALL 接受 `DELETE /api/users/me/avatar`，刪除 Firebase Storage 上的頭像檔案，並清空 `avatarUrl`、`avatarKey`、`avatarLastUpdated`。

#### Scenario: 成功刪除

- **WHEN** 已登入使用者呼叫 DELETE /api/users/me/avatar 且使用者有頭像（`avatarKey` 不為 null）
- **THEN** 刪除 Firebase Storage 上對應的檔案，清空 `avatarUrl`、`avatarKey`、`avatarLastUpdated`，回傳 HTTP 204

#### Scenario: 使用者沒有頭像

- **WHEN** 使用者的 `avatarKey` 為 null
- **THEN** 直接回傳 HTTP 204（冪等操作，不報錯）
