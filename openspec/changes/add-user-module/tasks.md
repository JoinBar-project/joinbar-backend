## 1. Port/in — Use Case 介面

- [x] 1.1 建立 `src/application/port/in/user/GetUserUseCase.ts`（GetUserCommand、GetUserResult）
- [x] 1.2 建立 `src/application/port/in/user/UpdateUserUseCase.ts`（UpdateUserCommand、UpdateUserResult）
- [x] 1.3 建立 `src/application/port/in/user/ChangePasswordUseCase.ts`（ChangePasswordCommand）
- [x] 1.4 建立 `src/application/port/in/user/DeleteUserUseCase.ts`（DeleteUserCommand）
- [x] 1.5 建立 `src/application/port/in/user/UpdateAvatarUseCase.ts`（UpdateAvatarCommand、UpdateAvatarResult）
- [x] 1.6 建立 `src/application/port/in/user/DeleteAvatarUseCase.ts`（DeleteAvatarCommand）

## 2. Port/out — Repository 介面

- [x] 2.1 建立 `src/application/port/out/user/UpdateUserPort.ts`（updateProfile、softDelete、updateAvatar、clearAvatar）

## 3. Persistence Adapter

- [x] 3.1 在 `PrismaUserRepository` 新增 `UpdateUserPort` 實作（updateProfile：username/nickname/birthday；softDelete：設 deletedAt；updateAvatar：avatarUrl/avatarKey/avatarLastUpdated；clearAvatar：清空三個欄位）

## 4. Application Services

- [x] 4.1 建立 `src/application/service/user/GetUserService.ts`
- [x] 4.2 建立 `src/application/service/user/GetUserService.spec.ts`
- [x] 4.3 建立 `src/application/service/user/UpdateUserService.ts`
- [x] 4.4 建立 `src/application/service/user/UpdateUserService.spec.ts`
- [x] 4.5 建立 `src/application/service/user/ChangePasswordService.ts`（findByEmailWithPassword → bcrypt 比對 → validateOrThrow → updatePassword）
- [x] 4.6 建立 `src/application/service/user/ChangePasswordService.spec.ts`
- [x] 4.7 建立 `src/application/service/user/DeleteUserService.ts`（softDelete → clearUserContext）
- [x] 4.8 建立 `src/application/service/user/DeleteUserService.spec.ts`
- [x] 4.9 建立 `src/application/service/user/UpdateAvatarService.ts`（若有舊 avatarKey 先 delete → upload → getSignedUrl → updateAvatar）
- [x] 4.10 建立 `src/application/service/user/UpdateAvatarService.spec.ts`
- [x] 4.11 建立 `src/application/service/user/DeleteAvatarService.ts`（若有 avatarKey 則 delete → clearAvatar；無則直接回傳）
- [x] 4.12 建立 `src/application/service/user/DeleteAvatarService.spec.ts`

## 5. Facade

- [x] 5.1 建立 `src/application/facade/UserFacade.ts`，彙整六個 use case

## 6. Controller & DTO

- [ ] 6.1 建立 `src/adapter/in/web/user/dto/UserProfileResponse.ts`（含 `@ApiProperty`）
- [ ] 6.2 建立 `src/adapter/in/web/user/dto/UpdateUserRequest.ts`（Zod schema，username/nickname/birthday 皆可選）
- [ ] 6.3 建立 `src/adapter/in/web/user/dto/ChangePasswordRequest.ts`（Zod schema，oldPassword + newPassword）
- [ ] 6.4 建立 `src/adapter/in/web/user/dto/AvatarResponse.ts`（avatarUrl: string）
- [ ] 6.5 建立 `src/adapter/in/web/user/UserController.ts`（GET /me、PATCH /me、POST /me/password、DELETE /me、POST /me/avatar、DELETE /me/avatar；全部加 `@UseGuards(JwtAuthGuard)`）

## 7. Module 配線

- [ ] 7.1 建立 `src/modules/user.module.ts`（imports: AuthModule, StorageModule；providers: services + facade + UpdateUserPort；controllers: UserController）
- [ ] 7.2 在 `src/app.module.ts` 引入 `UserModule`

## 8. Swagger 文件

- [ ] 8.1 在所有 DTO 與 Response 加上 `@ApiProperty()` 裝飾器
- [ ] 8.2 在 `UserController` 每個端點加 `@ApiOperation()`、`@ApiResponse()`
- [ ] 8.3 執行 `npm run swagger:bundle` 確認輸出正確

## 9. 測試

- [ ] 9.1 建立 `test/user.e2e-spec.ts`，涵蓋：查詢 profile、更新 profile、換密碼成功/舊密碼錯誤、刪除帳號後 403、上傳頭像、刪除頭像

## 10. 品質驗證

- [ ] 10.1 執行 `npx tsc --noEmit`，修正所有型別錯誤
- [ ] 10.2 執行 `npm run lint`，修正所有 lint 警告
- [ ] 10.3 執行 `npm run test`，確認所有單元測試通過
- [ ] 10.4 執行 `npm run test:e2e`，確認 E2E 測試通過
