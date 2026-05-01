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

### Requirement: LINE id_token 解析（不驗簽）

系統 SHALL 從 HTTPS LINE API 回應中取得的 id_token 解析 email，不驗證 JWT 簽章與 audience。

**設計決策**：id_token 來自 LINE API 的 HTTPS 回應（非使用者自行提交），視為已信任來源，省略簽章驗證。
若 id_token 長度超過 4096 字元或格式不符，靜默回傳 `null`（email 欄位為 null，不中斷登入流程）。

#### Scenario: id_token 含 email

- **WHEN** LINE 回傳的 id_token 包含 `email` claim
- **THEN** 解析並設定使用者 email（新建使用者時寫入 `UserAuthProvider.email`）

#### Scenario: id_token 無 email 或解析失敗

- **WHEN** id_token 不含 email 或長度超過 4096 字元
- **THEN** email 設為 null，登入流程繼續（LINE 帳號允許無 email）

### Requirement: Auth Log 記錄 LINE 登入（可選）

當 `authLogEnabled=true` 時，LINE 登入成功 SHALL 寫入 `action=LOGIN_SUCCESS` log。

#### Scenario: LINE 登入寫 log

- **WHEN** LINE 登入成功且 `authLogEnabled=true`
- **THEN** 寫入含 userId、email（LINE 帳號 email，可為 null）的 LOGIN_SUCCESS log
