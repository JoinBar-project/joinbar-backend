## Why

joinbar-backend 目前只有基礎建設（Redis、JWT、Guard、Filter、reCAPTCHA 等），尚無任何 domain 模組實作。Auth 模組是所有後續模組的前提——沒有認證就無法保護 API，也無法建立使用者 context。

## What Changes

- 新增 `User` domain entity（含 Email/密碼/LINE/Google 多 provider 認證）
- 新增 Email 登入、登出、JWT Refresh Token 三支 API
- 新增 LINE OAuth 登入 API
- 新增 Email 帳號註冊 API（含 emailVerificationEnabled feature flag）
- 新增密碼重設流程（request token + confirm reset）
- 實作 `LoadUserContextPort`（`JwtAuthGuard` 依賴此 port 載入使用者角色/權限）
- 完成 `auth.module.ts` 模組配線，將所有 auth service/facade/controller 組裝至 NestJS DI
- 接線 feature flags：`authLogEnabled`、`accountLockEnabled`、`googleRecaptchaEnabled`、`emailVerificationEnabled`

## Capabilities

### New Capabilities

- `email-login`: Email + 密碼登入，回傳 access/refresh token；含 reCAPTCHA、帳號鎖定、auth log
- `logout`: 登出，將 access/refresh token 加入黑名單，清除 user context 快取
- `refresh-token`: 用 refresh token 換發新 access token
- `line-login`: LINE OAuth callback，找到/建立 UserAuthProvider(LINE)，回傳 token
- `email-register`: Email 帳號註冊，可選 email 驗證流程（emailVerificationEnabled）
- `password-reset`: 密碼重設（申請 token、寄信、確認重設）
- `load-user-context`: 根據 userId 載入 roleName/permissions/status，供 JwtAuthGuard 使用

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- **新增檔案**：`src/domain/model/User.ts`、`src/application/port/in/auth/*.ts`、`src/application/port/out/user/FindUserPort.ts`、`src/application/service/auth/*.ts`、`src/application/facade/AuthFacade.ts`、`src/adapter/in/web/auth/*.ts`、`src/adapter/out/persistence/user/PrismaUserRepository.ts`、`src/modules/auth.module.ts`
- **依賴**：`JwtModule`、`RedisModule`、`AuthLogModule`、`SecurityModule`、`RecaptchaModule`（全部已完成）
- **Schema**：`UserRecord`（users 表）、`UserAuthProvider`（user_auth_providers）、`PasswordResetTokenRecord` 均已定義於 `prisma/schema.prisma`
- **解鎖**：`JwtAuthGuard` 正式可用，後續所有需認證模組可開始實作
