## Context

auth 模組已完成：`User` domain entity、`PrismaUserRepository`（實作 `FindUserPort`、`SaveUserPort`、`LoadUserContextPort`）均已存在。user 模組在此基礎上新增帳號自我管理功能，不重建現有元件。

所有端點皆位於 `/api/users/me`，僅操作「目前登入者自己」的資料，無跨使用者存取。

## Goals / Non-Goals

**Goals:**

- 查詢自己的完整 profile
- 更新 username、nickname、birthday
- 驗證舊密碼後更換新密碼
- 軟刪除自己的帳號

**Non-Goals:**

- 管理員對其他使用者的 CRUD（留待 admin 功能）
- FCM token 管理（notification 模組負責）
- 使用者列表 / 搜尋

## Decisions

### D1：擴充 PrismaUserRepository，不建立新 Repository

**選擇**：在現有 `PrismaUserRepository` 新增 `UpdateUserPort` 實作，透過 `useExisting` 注冊。
**理由**：User 相關操作都在同一張表（`UserRecord`），一個 repository 對應一個聚合根。拆出新類別只會製造重複的 Prisma 呼叫。
**替代方案**：建立獨立的 `PrismaUserProfileRepository` → 職責切割過細，且需管理兩個 DI token 指向同一張表。

### D2：UserFacade 獨立，不合併至 AuthFacade

**選擇**：建立 `UserFacade`，不把 user use case 塞進 `AuthFacade`。
**理由**：`AuthFacade` 職責是認證流程；profile 管理是不同的業務邊界。Module 層也分開，避免循環依賴。

### D3：ChangePassword 在 Service 層驗舊密碼

**選擇**：`ChangePasswordService` 透過 `FindUserPort.findByEmailWithPassword` 取得密碼 hash，用 bcrypt 比對後再更新。
**理由**：和 `LoginService` 相同的密碼驗證模式，邏輯集中在 application layer。

### D4：DeleteAccount 軟刪除後清除 UserContext 快取

**選擇**：設定 `deletedAt = now`，並呼叫 `ClearUserContextPort.clearUserContext(userId)` 強制登出。
**理由**：與 `ConfirmPasswordResetService` 相同的模式。`JwtAuthGuard` 的 `assertActive()` 會在下一次請求時拋出 403。

### D5：Controller 路由全部用 /api/users/me（無 :id 參數）

**選擇**：`userId` 由 `@CurrentUser()` 從 JWT 取得，不接受路徑參數。
**理由**：user 模組僅支援自我管理，不支援管理員操作他人帳號。

### D6：Avatar 使用現有 FileStoragePort，不新增 StoragePort

**選擇**：`UpdateAvatarUseCase` 注入 `FILE_STORAGE_PORT`（`FirebaseStorageAdapter` 已實作），上傳後存 `avatarKey`（Firebase 路徑）與 `avatarUrl`（signed URL）；`DeleteAvatarUseCase` 透過 `avatarKey` 刪除 Storage 上的檔案後清空三個欄位。
**理由**：`StorageModule` 已 global export `FILE_STORAGE_PORT`，無需額外配線。`avatarKey` 分開存是為了讓 delete 不依賴 URL 格式。
**替代方案**：每次取 profile 時重新產生 signed URL → 增加 Firebase 呼叫次數且 signed URL 有 TTL，不如存入 DB 在上傳時一次生成。

## Risks / Trade-offs

- **PrismaUserRepository 持續膨脹**：隨著模組增加，此 repo 可能超過 400 行。→ 目前可接受，待超過門檻時拆分為 `UserProfileRepository`。
- **email 欄位 null**：LINE 使用者可能無 email，`GetUserProfile` 回傳 `email: null`，前端需處理。

## Migration Plan

無需新 migration（`UserRecord` 現有欄位已足夠）。
