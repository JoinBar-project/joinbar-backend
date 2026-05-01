# email-register Specification

## Purpose
TBD - created by archiving change add-auth-module. Update Purpose after archive.
## Requirements
### Requirement: Email 帳號註冊

系統 SHALL 接受 email + 密碼，建立新的 `UserRecord` 及 `UserAuthProvider(EMAIL)`。

#### Scenario: 註冊成功（email 驗證停用）

- **WHEN** `emailVerificationEnabled=false` 且 email 未被使用
- **THEN** 建立使用者，`isVerified=true`，回傳 `{ verified: true }` HTTP 201

#### Scenario: 註冊成功（email 驗證啟用）

- **WHEN** `emailVerificationEnabled=true` 且 email 未被使用
- **THEN** 建立使用者，`isVerified=false`，寄出驗證信，回傳 `{ verified: false }` HTTP 201

#### Scenario: Email 已存在

- **WHEN** 提交的 email 已有對應的 UserAuthProvider(EMAIL)
- **THEN** 回傳 HTTP 409，不建立使用者

### Requirement: 密碼強度驗證

系統 SHALL 依 `PasswordPolicyService` 規則驗證密碼，不符合者拒絕註冊。

#### Scenario: 密碼不符合複雜度

- **WHEN** 密碼長度或複雜度不符合 `APPLICATION_PASSWORD_COMPLEXITY` 設定
- **THEN** 回傳 HTTP 400，說明密碼規則

### Requirement: Email 驗證信（可選）

當 `emailVerificationEnabled=true` 時，系統 SHALL 產生 verify token 並透過 `SendEmailPort` 寄出驗證連結。

#### Scenario: 驗證信寄出

- **WHEN** 註冊成功且 `emailVerificationEnabled=true`
- **THEN** `UserAuthProvider.verifyToken` 被設定，驗證連結寄至使用者 email

#### Scenario: 確認 email 驗證

- **WHEN** 使用者點擊驗證連結並提交有效 token
- **THEN** `isVerified=true`，`verifyToken` 清除，回傳 HTTP 200

#### Scenario: 驗證 token 過期

- **WHEN** 驗證 token 超過 `verifyExpires`
- **THEN** 回傳 HTTP 400，提示重新申請驗證信

