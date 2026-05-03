## Why

auth 模組完成後，使用者已能登入，但無法查詢或管理自己的帳號資料（profile、密碼、頭像、軟刪除）。user 模組提供登入後的帳號自我管理功能，是後續 bar/event 等業務模組的前提（需要 userId 對應的完整 profile）。

## What Changes

- 新增 `GetUserUseCase`：取得目前登入使用者的完整 profile
- 新增 `UpdateUserUseCase`：更新 username、nickname、birthday
- 新增 `ChangePasswordUseCase`：舊密碼驗證後更換新密碼
- 新增 `DeleteUserUseCase`：軟刪除帳號（設定 deletedAt）
- 新增 `UpdateAvatarUseCase`：上傳頭像圖片至 Firebase Storage，更新 `avatarUrl`、`avatarKey`、`avatarLastUpdated`
- 新增 `DeleteAvatarUseCase`：刪除 Firebase Storage 上的頭像檔案，清空 avatar 欄位
- 新增 `UserController`（`/api/users/me`），所有端點需 JWT 認證
- 新增 `UserFacade` 作為 controller 的入口
- 新增 `UpdateUserPort`：profile 更新 + 軟刪除的 persistence port
- 擴充 `PrismaUserRepository`：實作 `UpdateUserPort`（auth 模組已實作 `FindUserPort`、`SaveUserPort`、`LoadUserContextPort`）
- 新增 `user.module.ts` 模組配線

## Capabilities

### New Capabilities

- `get-user-profile`: 取得自己的帳號資料（id、email、username、nickname、role、birthday、avatarUrl）
- `update-user-profile`: 更新 username、nickname、birthday
- `change-password`: 舊密碼驗證後設定新密碼
- `delete-account`: 軟刪除自己的帳號
- `update-avatar`: 上傳頭像至 Firebase Storage，回傳 signed URL
- `delete-avatar`: 刪除 Firebase Storage 頭像檔案，清空 avatar 欄位

### Modified Capabilities

（無）

## Impact

- **新增檔案**：`src/application/port/in/user/`、`src/application/port/out/user/UpdateUserPort.ts`、`src/application/service/user/`、`src/application/facade/UserFacade.ts`、`src/adapter/in/web/user/`、`src/modules/user.module.ts`
- **擴充**：`src/adapter/out/persistence/user/PrismaUserRepository.ts`（新增 `UpdateUserPort` 實作）
- **依賴**：`AuthModule`（`LOAD_USER_CONTEXT_PORT`）、`JwtAuthGuard`（全部端點需認證）
- **Schema**：`UserRecord` 已有所需欄位（username、nickname、birthday、avatarUrl、deletedAt），無需新增 migration
