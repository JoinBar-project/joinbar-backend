## ADDED Requirements

### Requirement: 載入使用者 Context

系統 SHALL 提供 `LoadUserContextPort` 的實作，根據 userId 從 DB 查詢使用者資料，供 `JwtAuthGuard` 組裝 `request.user`。

#### Scenario: 正常載入

- **WHEN** 提供有效的 userId
- **THEN** 回傳 `{ id, email, roleName, permissions, status, lastPasswordChange }`

#### Scenario: 使用者不存在

- **WHEN** userId 在 DB 中查無對應 UserRecord
- **THEN** 回傳 `null`（JwtAuthGuard 將回傳 HTTP 401）

### Requirement: Permissions 初期為空陣列

由於 joinbar 目前無 permission 表，系統 SHALL 回傳 `permissions: []`，以 `roleName` 作為存取控制依據。

#### Scenario: 一般使用者 context

- **WHEN** `UserRecord.role = USER`
- **THEN** 回傳 `{ roleName: 'USER', permissions: [] }`

#### Scenario: 管理員 context

- **WHEN** `UserRecord.role = ADMIN`
- **THEN** 回傳 `{ roleName: 'ADMIN', permissions: [] }`

### Requirement: User Context 快取

系統 SHALL 先查 Redis 快取，cache miss 才查 DB，並在查 DB 後寫回快取。

**實作位置**：快取邏輯在 `JwtAuthGuard`（透過 `UserContextCachePort`），而非在 `PrismaUserRepository.loadUserContext` 內。
`PrismaUserRepository.loadUserContext` 只負責查 DB；`JwtAuthGuard` 先查快取，miss 才呼叫此 port。

#### Scenario: 快取命中

- **WHEN** Redis 中有對應 userId 的 context
- **THEN** `JwtAuthGuard` 直接回傳快取資料，不呼叫 `LoadUserContextPort`

#### Scenario: 快取未命中

- **WHEN** Redis 無對應快取
- **THEN** `JwtAuthGuard` 呼叫 `LoadUserContextPort`（查 DB），寫回快取（TTL = access token 有效期），再回傳
