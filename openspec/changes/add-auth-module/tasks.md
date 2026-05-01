## 1. Schema 補全

- [x] 1.1 在 `UserRecord` 加入 `lastPasswordChange DateTime?` 欄位並執行 `prisma migrate dev`
- [x] 1.2 執行 `npm run db:generate` 重新產生 Prisma client

## 2. Domain Model

- [x] 2.1 建立 `src/domain/model/User.ts`（含 `create()`、`reconstitute()` 工廠方法，封裝業務規則）
- [x] 2.2 建立 `src/domain/model/User.spec.ts` 單元測試

## 3. Port/in — Use Case 介面

- [x] 3.1 建立 `src/application/port/in/auth/LoginUseCase.ts`（LoginCommand、LoginResult）
- [x] 3.2 建立 `src/application/port/in/auth/LogoutUseCase.ts`（LogoutCommand）
- [x] 3.3 建立 `src/application/port/in/auth/RefreshTokenUseCase.ts`（RefreshTokenCommand、RefreshTokenResult）
- [x] 3.4 建立 `src/application/port/in/auth/LineLoginUseCase.ts`（LineLoginCommand、LineLoginResult）
- [x] 3.5 建立 `src/application/port/in/auth/RegisterUseCase.ts`（RegisterCommand）
- [x] 3.6 建立 `src/application/port/in/auth/PasswordResetUseCase.ts`（RequestResetCommand、ConfirmResetCommand）
- [x] 3.7 建立 `src/application/port/in/auth/VerifyEmailUseCase.ts`（VerifyEmailCommand）

## 4. Port/out — Repository 介面

- [x] 4.1 建立 `src/application/port/out/user/FindUserPort.ts`（byEmail, byId, byLineUid, byProviderId）
- [x] 4.2 建立 `src/application/port/out/user/SaveUserPort.ts`（save, updateAuthProvider, updatePassword, updateLastLogin）
- [x] 4.3 建立 `src/application/port/out/auth/PasswordResetTokenPort.ts`（createToken, findByToken, markUsed）

## 5. Persistence Adapter

- [x] 5.1 建立 `src/adapter/out/persistence/user/PrismaUserRepository.ts`，實作 `FindUserPort`、`SaveUserPort`、`LoadUserContextPort`
- [x] 5.2 建立 `src/adapter/out/persistence/auth/PrismaPasswordResetTokenRepository.ts`，實作 `PasswordResetTokenPort`
- [x] 5.3 建立對應單元測試（mock PrismaService）

## 6. Application Services

- [x] 6.1 建立 `src/application/service/auth/LoginService.ts`（reCAPTCHA → 帳號鎖定 → 密碼驗證 → token 簽發 → session init → auth log）
- [x] 6.2 建立 `src/application/service/auth/LoginService.spec.ts`
- [x] 6.3 建立 `src/application/service/auth/LogoutService.ts`（token 黑名單 → context 清除 → auth log）
- [x] 6.4 建立 `src/application/service/auth/LogoutService.spec.ts`
- [ ] 6.5 建立 `src/application/service/auth/RefreshTokenService.ts`（黑名單檢查 → token 驗證 → 帳號狀態 → 換發 → auth log）
- [ ] 6.6 建立 `src/application/service/auth/RefreshTokenService.spec.ts`
- [ ] 6.7 建立 `src/application/service/auth/LineLoginService.ts`（LINE token 驗證 → upsert user → token 簽發 → auth log）
- [ ] 6.8 建立 `src/application/service/auth/LineLoginService.spec.ts`
- [ ] 6.9 建立 `src/application/service/auth/RegisterService.ts`（密碼強度 → email 唯一 → 建立 user/provider → email 驗證 flag）
- [ ] 6.10 建立 `src/application/service/auth/RegisterService.spec.ts`
- [ ] 6.11 建立 `src/application/service/auth/RequestPasswordResetService.ts`（查 email → 建 token → 寄信）
- [ ] 6.12 建立 `src/application/service/auth/ConfirmPasswordResetService.ts`（驗 token → 更新密碼 → 強制登出 flag → auth log）
- [ ] 6.13 建立 `src/application/service/auth/VerifyEmailService.ts`（驗 token → 設 isVerified）

## 7. Facade

- [ ] 7.1 建立 `src/application/facade/AuthFacade.ts`，彙整所有 auth use case

## 8. Controller & DTO

- [ ] 8.1 建立 `src/adapter/in/web/auth/dto/LoginRequest.ts`（email、password、recaptchaToken?）
- [ ] 8.2 建立 `src/adapter/in/web/auth/dto/LogoutRequest.ts`（refreshToken?）
- [ ] 8.3 建立 `src/adapter/in/web/auth/dto/RefreshTokenRequest.ts`（refreshToken）
- [ ] 8.4 建立 `src/adapter/in/web/auth/dto/LineLoginRequest.ts`（code、redirectUri）
- [ ] 8.5 建立 `src/adapter/in/web/auth/dto/RegisterRequest.ts`（email、password、username）
- [ ] 8.6 建立 `src/adapter/in/web/auth/dto/RequestPasswordResetRequest.ts`（email）
- [ ] 8.7 建立 `src/adapter/in/web/auth/dto/ConfirmPasswordResetRequest.ts`（token、newPassword）
- [ ] 8.8 建立 `src/adapter/in/web/auth/dto/VerifyEmailRequest.ts`（token）
- [ ] 8.9 建立 `src/adapter/in/web/auth/AuthController.ts`（所有 auth 端點，公開路由加 `@Public()`）

## 9. Module 配線

- [ ] 9.1 建立 `src/modules/auth.module.ts`（imports: MemberModule/UserModule、JwtModule；providers: services + facade；controllers: AuthController）
- [ ] 9.2 在 `src/app.module.ts` 引入 `AuthModule`
- [ ] 9.3 確認 `JwtAuthGuard` + `SessionIdleGuard` 掛載順序正確

## 10. Swagger 文件

- [ ] 10.1 在所有 DTO 加上 `@ApiProperty()` 裝飾器
- [ ] 10.2 在 `AuthController` 每個端點加 `@ApiOperation()`、`@ApiResponse()`
- [ ] 10.3 執行 `npm run swagger:bundle` 確認輸出正確

## 11. E2E 測試

- [ ] 11.1 建立 `test/auth.e2e-spec.ts`，涵蓋：登入成功/失敗、登出、換發 token、帳號鎖定、reCAPTCHA bypass（test env）

## 12. 品質驗證

- [ ] 12.1 執行 `npx tsc --noEmit`，修正所有型別錯誤
- [ ] 12.2 執行 `npm run lint`，修正所有 lint 警告
- [ ] 12.3 執行 `npm run test`，確認所有單元測試通過
- [ ] 12.4 執行 `npm run test:e2e`，確認 E2E 測試通過
