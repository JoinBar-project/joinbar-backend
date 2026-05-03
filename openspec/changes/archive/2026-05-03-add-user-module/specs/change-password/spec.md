## ADDED Requirements

### Requirement: 更換密碼

系統 SHALL 接受 `POST /api/users/me/password`，驗證舊密碼後更換為新密碼。

#### Scenario: 成功更換

- **WHEN** 已登入使用者提交正確的 `oldPassword` 與符合密碼強度的 `newPassword`
- **THEN** 更新密碼 hash 與 `lastPasswordChange`，回傳 HTTP 204

#### Scenario: 舊密碼錯誤

- **WHEN** 提交的 `oldPassword` 與目前密碼 hash 不符
- **THEN** 回傳 HTTP 401

#### Scenario: 新密碼不符合密碼強度

- **WHEN** `newPassword` 不符合 `PasswordPolicyService` 規則
- **THEN** 回傳 HTTP 400

### Requirement: EMAIL Provider 限制

系統 SHALL 只允許有 EMAIL provider 的使用者執行此操作；純 LINE 使用者無密碼可更換。

#### Scenario: 純 LINE 使用者

- **WHEN** 使用者帳號只有 LINE provider，無 EMAIL provider
- **THEN** 回傳 HTTP 422
