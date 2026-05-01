## Context

joinbar 的認證架構與 atago 最大差異：

1. **多 provider 登入**：密碼不在 `UserRecord`，而在 `UserAuthProvider`（EMAIL provider）。LINE、Google 登入各自有一筆 provider row。
2. **角色簡化**：atago 有 Role/Permission 關聯表；joinbar 用 `UserRoleEnum`（USER/ADMIN）直接掛在 `UserRecord`，不需要 role module。
3. **User context 欄位**：`LoadUserContextPort` 回傳 `roleName: string` + `permissions: string[]`；joinbar 目前無 permission 表，permissions 陣列在初期設為空（由 roleName 決定存取權）。
4. **現有基礎建設已就緒**：`JwtModule`、`RedisModule`（TokenBlacklist、UserContextCache、SessionActivity）、`AuthLogModule`、`SecurityModule`（AccountLock、IpBlock）、`RecaptchaModule`、`StorageModule` 全部已完成。

參考來源：atago `src/application/service/auth/` 三支 service（LoginService、LogoutService、RefreshTokenService）。

## Goals / Non-Goals

**Goals:**

- 實作 Email 登入 / 登出 / Token 更新三個核心 API
- 實作 LINE OAuth 登入（使用 Firebase Auth LINE provider 或 LINE Login API）
- 實作 Email 帳號註冊，含可選的 email 驗證流程
- 實作密碼重設流程（申請 → 寄信 → 確認）
- 完成 `LoadUserContextPort` 實作，讓 `JwtAuthGuard` 可正常運作
- 每支 service 皆有對應單元測試

**Non-Goals:**

- Google OAuth（留待 user 模組確認需求後再加）
- FCM token 管理（notification 模組負責）
- 管理員 CRUD 操作（user 模組負責）
- LINE Pay（order 模組負責）

## Decisions

### D1：密碼存放於 UserAuthProvider，非 UserRecord

**選擇**：從 `UserAuthProvider`（EMAIL provider）讀取密碼進行 bcrypt 比對。  
**理由**：schema 已固定；統一多 provider 架構，未來新增 Google OAuth 不需改 UserRecord。  
**替代方案**：在 UserRecord 加 password 欄位 → 需 migration，與現有 schema 不符。

### D2：LINE 登入使用 LINE Login API 直接對接，不透過 Firebase

**選擇**：後端直接呼叫 LINE `/oauth2/v2.1/token` 取得 id_token，驗證後 upsert `UserAuthProvider(LINE)`。  
**理由**：Firebase Auth 的 LINE provider 需要前端 SDK 配合；後端 REST API 架構下，直接對接更簡單可控。  
**替代方案**：Firebase Custom Token → 需要 Firebase Admin SDK 額外流程，複雜度更高。

### D3：RefreshToken 不旋轉

**選擇**：換發新 access token 時，refresh token 保持不變。  
**理由**：與 atago 一致，減少前端 token 管理複雜度；refresh token 有獨立黑名單保護。  
**替代方案**：旋轉 refresh token → 需要 atomic replace，增加 race condition 風險。

### D4：LoadUserContextPort 初期不查 permissions 表

**選擇**：`permissions: []`（空陣列），只用 `roleName`（USER/ADMIN）做存取控制。  
**理由**：joinbar 目前無 permission/role_permission 表；`PermissionsGuard` 可改為只檢查 roleName。  
**替代方案**：立即建 permission 表 → over-engineering，joinbar 業務邏輯目前不需要細粒度 permission。

### D5：帳號鎖定計數存 UserAuthProvider，不存 UserRecord

**選擇**：`failedLoginCount` 與 `lockedAt` 在 `UserRecord`（schema 已有）。  
**理由**：schema 已固定；`PrismaAccountLockAdapter` 已實作，直接使用。

### D6：email 驗證流程由 feature flag 控制

**選擇**：`emailVerificationEnabled=false` 時，註冊直接設 `isVerified=true`，不寄驗證信。  
**理由**：開發/測試環境可快速驗證流程；生產環境開啟確保 email 真實性。

## Risks / Trade-offs

- **LINE Login API 版本**：LINE `/oauth2/v2.1` id_token 驗證需要 `channel_id` 作為 audience，須確認 env 有 `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`。→ 在 validate-env.ts 補充對應欄位（conditions on `linePayEnabled` 或新增 `lineLoginEnabled`）。
- **permissions 空陣列**：`PermissionsGuard` 若有任何 `@RequiredPermissions()` 裝飾器，永遠會被擋下。→ 初期文件說明此限制；待 benefit/admin 功能需要時再補 permissions 表。
- **UserRecord 無 `lastPasswordChange`**：atago 的 `checkPasswordExpiry`（`passwordChangeEnabled`）依賴此欄位。→ 需在 UserRecord 加 `lastPasswordChange` 欄位，或從 `UserAuthProvider` 的 `updatedAt` 推算。決策：在 UserRecord 加 `lastPasswordChange DateTime?` 欄位並補 migration。

## Migration Plan

1. 確認 `prisma/schema.prisma` 中 UserRecord 加入 `lastPasswordChange` 欄位
2. `npx prisma migrate dev --name add-user-last-password-change`
3. 部署時確認 `AUTH_LOG_ENABLED`、`ACCOUNT_LOCK_ENABLED` 等 feature flag 預設值符合預期
4. Rollback：feature flags 全部關閉可讓 LoginService 退化為最基本流程

## Open Questions

- `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` 是否需要新增至 `validate-env.ts`，還是 LINE 登入延後到下一個 change？
- `permissions` 空陣列方案是否夠用，或需要立即建 `UserPermission` 表？
