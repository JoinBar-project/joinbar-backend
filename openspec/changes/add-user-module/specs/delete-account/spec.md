## ADDED Requirements

### Requirement: 軟刪除帳號

系統 SHALL 接受 `DELETE /api/users/me`，將 `UserRecord.deletedAt` 設為目前時間。

#### Scenario: 成功刪除

- **WHEN** 已登入使用者呼叫 DELETE /api/users/me
- **THEN** 設定 `deletedAt = now`，清除 Redis UserContext 快取，回傳 HTTP 204

#### Scenario: 刪除後再次請求

- **WHEN** 使用相同 JWT 再次呼叫任何需認證的 API
- **THEN** `JwtAuthGuard` 偵測到帳號已停用，回傳 HTTP 403
