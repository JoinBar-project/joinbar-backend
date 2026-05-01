## ADDED Requirements

### Requirement: LINE OAuth 登入

系統 SHALL 接受 LINE authorization code，完成 OAuth 流程後回傳 access/refresh token。

#### Scenario: 既有使用者登入

- **WHEN** LINE uid 對應的 `UserAuthProvider(LINE)` 已存在
- **THEN** 更新 displayName/pictureUrl，回傳 token，HTTP 200

#### Scenario: 新使用者首次登入

- **WHEN** LINE uid 無對應的 UserAuthProvider
- **THEN** 建立新 `UserRecord` + `UserAuthProvider(LINE)`，回傳 token，HTTP 200

#### Scenario: LINE API 呼叫失敗

- **WHEN** 使用無效的 authorization code 或 LINE 服務不可用
- **THEN** 回傳 HTTP 401

### Requirement: LINE Token 驗證

系統 SHALL 使用 `LINE_CHANNEL_ID` 驗證 id_token 的 audience，防止 token 替換攻擊。

#### Scenario: audience 不符

- **WHEN** id_token 的 aud 不等於 `LINE_CHANNEL_ID`
- **THEN** 回傳 HTTP 401，不建立 session

### Requirement: Auth Log 記錄 LINE 登入（可選）

當 `authLogEnabled=true` 時，LINE 登入成功 SHALL 寫入 `action=LOGIN_SUCCESS` log。

#### Scenario: LINE 登入寫 log

- **WHEN** LINE 登入成功且 `authLogEnabled=true`
- **THEN** 寫入含 userId、email（LINE 帳號 email，可為 null）的 LOGIN_SUCCESS log
