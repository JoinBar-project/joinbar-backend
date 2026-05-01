## ADDED Requirements

### Requirement: 登出使 Token 失效

系統 SHALL 將 access token 加入黑名單，並在提供 refresh token 時一併加入黑名單。

#### Scenario: 正常登出

- **WHEN** 已認證使用者呼叫登出 API，提供 access token（及可選 refresh token）
- **THEN** 兩個 token 均被加入黑名單，後續使用這些 token 的請求回傳 HTTP 401

#### Scenario: 未提供 refresh token

- **WHEN** 登出請求未包含 `refreshToken`
- **THEN** 僅 access token 加入黑名單，登出仍成功（HTTP 204）

### Requirement: 清除 User Context 快取

系統 SHALL 在登出時清除 Redis 中的 user context 快取。

#### Scenario: 快取清除

- **WHEN** 登出成功
- **THEN** 呼叫 `ClearUserContextPort.clearUserContext(userId)`

### Requirement: Auth Log 記錄登出（可選）

當 `authLogEnabled=true` 時，系統 SHALL 寫入 `action=LOGOUT` 的 auth log。

#### Scenario: 登出寫 log

- **WHEN** 登出成功且 `authLogEnabled=true`
- **THEN** 寫入含 userId、email、ipAddress 的 LOGOUT log
