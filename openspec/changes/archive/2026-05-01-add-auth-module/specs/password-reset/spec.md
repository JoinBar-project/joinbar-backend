## ADDED Requirements

### Requirement: 申請密碼重設

系統 SHALL 在收到有效 email 後，產生 `PasswordResetTokenRecord` 並寄出重設連結。

#### Scenario: 申請成功

- **WHEN** 提交已存在且有 EMAIL provider 的 email
- **THEN** 建立重設 token，透過 `SendEmailPort` 寄出連結，回傳 HTTP 204

#### Scenario: Email 不存在

- **WHEN** 提交不存在的 email
- **THEN** 仍回傳 HTTP 200（防止 email enumeration），不寄信

### Requirement: 確認密碼重設

系統 SHALL 接受有效的重設 token 與新密碼，更新 `UserAuthProvider(EMAIL).password`。

#### Scenario: 重設成功

- **WHEN** token 有效（未過期、未使用）且新密碼符合密碼強度
- **THEN** 更新密碼，標記 token `usedAt`，回傳 HTTP 204

#### Scenario: Token 無效或過期

- **WHEN** token 不存在、已使用或 `expiresAt` 已過
- **THEN** 回傳 HTTP 400

#### Scenario: 新密碼不符合強度

- **WHEN** 新密碼不符合 `PasswordPolicyService` 規則
- **THEN** 回傳 HTTP 400

### Requirement: 重設後強制登出（可選）

當 `logoutAfterPasswordResetEnabled=true` 時，系統 SHALL 將使用者所有現有 token 設為無效。
對應環境變數：`APPLICATION_IS_LOGOUT_AFTER_PASSWORD_RESET`（預設 `true`），由 `FeatureFlagService` 管控。

#### Scenario: 重設後清除 session

- **WHEN** 密碼重設成功且 `logoutAfterPasswordResetEnabled=true`
- **THEN** 清除 Redis user context 快取（等效強制重新登入）

### Requirement: Auth Log 記錄密碼重設（可選）

當 `authLogEnabled=true` 時，系統 SHALL 寫入 `action=PASSWORD_RESET` log。

#### Scenario: 密碼重設寫 log

- **WHEN** 密碼重設成功且 `authLogEnabled=true`
- **THEN** 寫入含 userId、email 的 PASSWORD_RESET log
