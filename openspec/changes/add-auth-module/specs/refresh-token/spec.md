## ADDED Requirements

### Requirement: 換發 Access Token

系統 SHALL 接受有效的 refresh token，回傳新的 access token；refresh token 本身不旋轉。

#### Scenario: 換發成功

- **WHEN** 提供未過期且未在黑名單中的 refresh token
- **THEN** 回傳新的 `{ accessToken }` 且 HTTP 200

#### Scenario: Token 在黑名單中

- **WHEN** refresh token 已被登出加入黑名單
- **THEN** 回傳 HTTP 401

#### Scenario: Token 類型錯誤

- **WHEN** 提供的是 access token（type != 'refresh'）
- **THEN** 回傳 HTTP 401

#### Scenario: Token 已過期

- **WHEN** refresh token 超過 `REFRESH_TOKEN_EXPIRES_IN`
- **THEN** 回傳 HTTP 401

### Requirement: 使用者狀態檢查

換發前系統 SHALL 確認使用者帳號仍然有效。

#### Scenario: 帳號已被鎖定

- **WHEN** 換發時發現帳號 `lockedAt` 不為 null
- **THEN** 回傳 HTTP 423

### Requirement: Auth Log 記錄換發（可選）

當 `authLogEnabled=true` 時，系統 SHALL 寫入 `action=REFRESH` 的 auth log。

#### Scenario: 換發寫 log

- **WHEN** 換發成功且 `authLogEnabled=true`
- **THEN** 寫入含 userId、email 的 REFRESH log
