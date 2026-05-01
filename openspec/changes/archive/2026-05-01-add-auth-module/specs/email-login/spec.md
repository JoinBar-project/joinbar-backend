## ADDED Requirements

### Requirement: Email 登入

系統 SHALL 接受 email + 密碼，驗證成功後回傳 access token 與 refresh token。

#### Scenario: 登入成功

- **WHEN** 使用者提交有效的 email 與密碼
- **THEN** 系統回傳 `{ accessToken, refreshToken, accessTokenExpiresIn, refreshTokenExpiresIn, user: { id, email, username, role } }` 且 HTTP 200

#### Scenario: 密碼錯誤

- **WHEN** 使用者提交正確 email 但錯誤密碼
- **THEN** 系統回傳 HTTP 401，失敗計數 +1

#### Scenario: 帳號不存在

- **WHEN** 使用者提交不存在的 email
- **THEN** 系統回傳與密碼錯誤相同的 HTTP 401（防止 user enumeration）

### Requirement: reCAPTCHA 驗證（可選）

當 `googleRecaptchaEnabled=true` 時，系統 SHALL 在比對密碼前驗證 reCAPTCHA token。

#### Scenario: reCAPTCHA 停用

- **WHEN** `googleRecaptchaEnabled=false`
- **THEN** 系統忽略 `recaptchaToken` 欄位，直接進行密碼驗證

#### Scenario: reCAPTCHA 驗證失敗

- **WHEN** `googleRecaptchaEnabled=true` 且 `recaptchaToken` 無效或分數低於門檻
- **THEN** 系統回傳 HTTP 401，不執行密碼比對

### Requirement: 帳號鎖定（可選）

當 `accountLockEnabled=true` 時，系統 SHALL 在失敗次數達到 `ACCOUNT_LOCK_THRESHOLD` 後鎖定帳號。

#### Scenario: 帳號鎖定停用

- **WHEN** `accountLockEnabled=false`
- **THEN** 系統不追蹤失敗次數，不鎖定帳號

#### Scenario: 達到鎖定門檻

- **WHEN** 連續失敗次數達到 `ACCOUNT_LOCK_THRESHOLD`
- **THEN** 帳號被鎖定，後續登入回傳 HTTP 403

#### Scenario: 帳號已鎖定

- **WHEN** 帳號 `lockedAt` 不為 null
- **THEN** 系統回傳 HTTP 403，不執行密碼比對

### Requirement: Auth Log 記錄（可選）

當 `authLogEnabled=true` 時，系統 SHALL 在登入成功與失敗時各寫一筆 auth log。

#### Scenario: 登入成功寫 log

- **WHEN** 登入成功
- **THEN** 寫入 `action=LOGIN_SUCCESS`，含 userId、email、ipAddress、userAgent

#### Scenario: 登入失敗寫 log

- **WHEN** 密碼錯誤或帳號不存在
- **THEN** 寫入 `action=LOGIN_FAILURE`，含 email、ipAddress（userId 可為 null）

### Requirement: Session 活動初始化

登入成功後，系統 SHALL 透過 `SessionActivityPort` 記錄初始活動時間。

#### Scenario: Session 初始化

- **WHEN** 登入成功且 `sessionIdleEnabled=true`
- **THEN** 系統以 userId 寫入 session 活動時間戳
