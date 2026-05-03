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

### D6：Avatar 使用現有 FileStoragePort，URL 於讀取時即時產生

**選擇**：`UpdateAvatarUseCase` 注入 `FILE_STORAGE_PORT`，上傳後存 `avatarKey`（Firebase 永久路徑）；`GetUserService`、`UpdateUserService` 在回傳 profile 時呼叫 `getSignedUrl(avatarKey)` 即時產生 URL，不依賴 DB 的 `avatarUrl` 快取欄位。`DeleteAvatarUseCase` 透過 `avatarKey` 刪除 Storage 上的檔案後清空三個欄位。
**理由**：Signed URL 有時效性（預設 3600 秒），若存入 DB 會在過期後回傳失效連結；每次讀取產生可確保 URL 永遠有效。Firebase `getSignedUrl` 呼叫本身成本極低，且 profile 讀取頻率不高。
**操作順序（UpdateAvatar）**：先上傳新檔 → 更新 DB → 刪除舊檔（`.catch` 吞錯，不影響主流程）。此順序確保 DB 更新失敗時舊資料不受影響；舊檔若刪除失敗可由定期清理任務補處理。
**檔案驗證**：以 magic number（Buffer 前幾個 bytes）判斷圖片格式（JPEG / PNG / GIF / WebP），不依賴 client 提供的 Content-Type header（可偽造）。檔案大小上限 5 MB。

## Risks / Trade-offs

- **PrismaUserRepository 持續膨脹**：隨著模組增加，此 repo 可能超過 400 行。→ 目前可接受，待超過門檻時拆分為 `UserProfileRepository`。
- **email 欄位 null**：LINE 使用者可能無 email，`GetUserProfile` 回傳 `email: null`，前端需處理。

## Migration Plan

無需新 migration（`UserRecord` 現有欄位已足夠）。
