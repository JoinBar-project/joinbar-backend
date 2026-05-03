# 待辦事項

跨變更的待處理項目與延後功能。

---

## 全域基礎設施（已完成）

基礎建設（Redis、JWT、Email、Firebase、reCAPTCHA、Storage、FeatureFlag、SystemLog、AuthLog、Security Guards）已全部完成。

---

## 跨模組待處理

- [x] **Guard 全域註冊**：`JwtAuthGuard` 在 `AuthController` 的 logout 以 `@UseGuards(JwtAuthGuard)` 套用，掛載順序（Throttler → IpBlacklist → IpWhitelist）為全域 APP_GUARD，JwtAuthGuard 按需套用。公開路由已加 `@Public()`。
- [ ] **openspec/project.md 環境變數名稱**：將舊名稱（`JWT_ACCESS_SECRET` 等）更新為現行名稱（`ACCESS_SECRET`、`COOKIE_SECRET`）。
- [ ] **Firebase Storage 對帳腳本**：延後，待 storage 功能上線後再補。

---

## 模組實作待辦

各模組依序實作，每個模組完整包含：
Domain Model → Port/in → Port/out（Repository） → Service → Facade → Controller + DTO（含 `@ApiProperty`） → Persistence Adapter → Module 配線 → Swagger 文件（`@ApiOperation` / `@ApiResponse`） → 單元測試 → E2E 測試

實作流程：先用 `openspec-propose` 產出 spec/tasks，再用 `superpowers:test-driven-development` 逐 task 實作。

---

### auth 模組 ✅ 已完成

參考：atago `src/adapter/in/web/auth/`、`src/application/service/auth/`、`src/modules/auth.module.ts`

- [x] Domain Model：`User`（id、email、username、role、failedLoginCount、lockedAt、lastPasswordChange、deletedAt）
- [x] Port/in：`LoginUseCase`、`LogoutUseCase`、`RefreshTokenUseCase`、`RegisterUseCase`、`LineLoginUseCase`、`PasswordResetUseCase`（Request + Confirm）、`VerifyEmailUseCase`
- [x] Port/out：`FindUserPort`（byEmail+password, byProviderId, byId, byEmailVerifyToken）、`SaveUserPort`（createWithEmail/Line, upsertLine, updatePassword, setEmailVerified, updateLastLoginAt, updateLoginSecurity）、`LoadUserContextPort`、`PasswordResetTokenPort`、`LineOAuthPort`
- [x] Service：`LoginService`、`LogoutService`、`RefreshTokenService`、`LineLoginService`、`RegisterService`、`RequestPasswordResetService`、`ConfirmPasswordResetService`、`VerifyEmailService`
- [x] Facade：`AuthFacade`
- [x] Controller + DTO：`AuthController`（`/api/auth/*`，Zod 驗證，8 個端點）
- [x] Swagger：YAML 靜態文件（`docs/swagger/auth/*.yaml`），`npm run swagger:bundle` 驗證通過
- [x] Persistence Adapter：`PrismaUserRepository`、`PrismaPasswordResetTokenRepository`、`LineOAuthAdapter`
- [x] Module 配線：`auth.module.ts`，已注入 `app.module.ts`
- [x] Feature Flags：`authLogEnabled`、`accountLockEnabled`、`googleRecaptchaEnabled`、`emailVerificationEnabled`、`sessionIdleEnabled`、`ipBlacklistEnabled`
- [x] 測試：全部 spec（共 202 unit tests）+ `test/auth.e2e-spec.ts`（15 E2E tests）

---

### user 模組 ✅ 已完成

- [x] Port/in：`GetUserUseCase`、`UpdateUserUseCase`、`ChangePasswordUseCase`、`DeleteUserUseCase`、`UpdateAvatarUseCase`、`DeleteAvatarUseCase`
- [x] Port/out：`UpdateUserPort`（updateProfile / softDelete / updateAvatar / clearAvatar）；`FindUserPort` 擴充 `findProfileById`
- [x] Domain exception：`NoEmailProviderException` → GlobalExceptionFilter 422
- [x] Service：`GetUserService`、`UpdateUserService`、`ChangePasswordService`、`DeleteUserService`、`UpdateAvatarService`、`DeleteAvatarService`（共 214 unit tests）
- [x] Facade：`UserFacade`
- [x] Controller + DTO：`UserController`（`/api/users/*`，6 個端點，Zod 驗證，Multer 頭像上傳）
- [x] Swagger：YAML 靜態文件（`docs/swagger/user/*.yaml`），`npm run swagger:bundle` 驗證通過
- [x] Persistence Adapter：`PrismaUserRepository` 新增 UpdateUserPort 實作
- [x] Module 配線：`user.module.ts`，已注入 `app.module.ts`
- [x] 測試：11 E2E tests 全過

---

### bar 模組

- [ ] Domain Model：`Bar`（id、name、description、location、images、ownerId、status）
- [ ] Port/in：`CreateBarUseCase`、`GetBarUseCase`、`UpdateBarUseCase`、`DeleteBarUseCase`、`ListBarsUseCase`、`AiDescribeBarUseCase`
- [ ] Port/out：`FindBarByIdPort`、`SaveBarPort`、`ListBarsPort`、`GeminiGeneratePort`
- [ ] Service：`CreateBarService`、`GetBarService`、`UpdateBarService`、`ListBarsService`、`AiDescribeBarService`（含 `geminiEnabled`）
- [ ] Facade：`BarFacade`
- [ ] Controller + DTO：`BarController`（`/api/bars/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaBarRepository`
- [ ] Module 配線：`bar.module.ts`
- [ ] Feature Flags 接線：`geminiEnabled`
- [ ] 測試：各 Service.spec、bar.e2e-spec

---

### event 模組

- [ ] Domain Model：`Event`（id、barId、title、description、startAt、endAt、capacity、status）
- [ ] Port/in：`CreateEventUseCase`、`GetEventUseCase`、`UpdateEventUseCase`、`DeleteEventUseCase`、`ListEventsUseCase`、`JoinEventUseCase`、`LeaveEventUseCase`
- [ ] Port/out：`FindEventByIdPort`、`SaveEventPort`、`ListEventsPort`、`EventParticipantPort`
- [ ] Service：各 UseCase 對應 Service
- [ ] Facade：`EventFacade`
- [ ] Controller + DTO：`EventController`（`/api/events/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaEventRepository`
- [ ] Module 配線：`event.module.ts`
- [ ] 測試：各 Service.spec、event.e2e-spec

---

### order 模組

- [ ] Domain Model：`Order`（id、userId、eventId、amount、status、linePayTransactionId）
- [ ] Port/in：`CreateOrderUseCase`、`GetOrderUseCase`、`ListOrdersUseCase`、`ConfirmPaymentUseCase`、`CancelOrderUseCase`
- [ ] Port/out：`FindOrderByIdPort`、`SaveOrderPort`、`LinePayPort`
- [ ] Service：各 UseCase 對應 Service（含 `linePayEnabled`）
- [ ] Facade：`OrderFacade`
- [ ] Controller + DTO：`OrderController`（`/api/orders/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaOrderRepository`
- [ ] Module 配線：`order.module.ts`
- [ ] Feature Flags 接線：`linePayEnabled`
- [ ] 測試：各 Service.spec、order.e2e-spec

---

### cart 模組

- [ ] Domain Model：`Cart`、`CartItem`
- [ ] Port/in：`AddToCartUseCase`、`RemoveFromCartUseCase`、`GetCartUseCase`、`ClearCartUseCase`
- [ ] Port/out：`FindCartByUserIdPort`、`SaveCartPort`
- [ ] Service：各 UseCase 對應 Service
- [ ] Facade：`CartFacade`
- [ ] Controller + DTO：`CartController`（`/api/cart/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaCartRepository`
- [ ] Module 配線：`cart.module.ts`
- [ ] 測試：各 Service.spec、cart.e2e-spec

---

### subscription 模組

- [ ] Domain Model：`Subscription`（id、userId、planId、status、startAt、endAt）
- [ ] Port/in：`SubscribeUseCase`、`CancelSubscriptionUseCase`、`GetSubscriptionUseCase`
- [ ] Port/out：`FindSubscriptionByUserIdPort`、`SaveSubscriptionPort`
- [ ] Service：各 UseCase 對應 Service（含 `subscriptionEnabled`）
- [ ] Facade：`SubscriptionFacade`
- [ ] Controller + DTO：`SubscriptionController`（`/api/subscriptions/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaSubscriptionRepository`
- [ ] Module 配線：`subscription.module.ts`
- [ ] Feature Flags 接線：`subscriptionEnabled`
- [ ] 測試：各 Service.spec、subscription.e2e-spec

---

### benefit 模組

- [ ] Domain Model：`Benefit`（id、name、type、value、conditions）
- [ ] Port/in：`CreateBenefitUseCase`、`GetBenefitUseCase`、`ListBenefitsUseCase`、`ApplyBenefitUseCase`
- [ ] Port/out：`FindBenefitByIdPort`、`SaveBenefitPort`、`ListBenefitsPort`
- [ ] Service：各 UseCase 對應 Service
- [ ] Facade：`BenefitFacade`
- [ ] Controller + DTO：`BenefitController`（`/api/benefits/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaBenefitRepository`
- [ ] Module 配線：`benefit.module.ts`
- [ ] 測試：各 Service.spec、benefit.e2e-spec

---

### favorite 模組

- [ ] Domain Model：`Favorite`（userId、targetId、targetType）
- [ ] Port/in：`AddFavoriteUseCase`、`RemoveFavoriteUseCase`、`ListFavoritesUseCase`
- [ ] Port/out：`FindFavoritePort`、`SaveFavoritePort`、`ListFavoritesPort`
- [ ] Service：各 UseCase 對應 Service
- [ ] Facade：`FavoriteFacade`
- [ ] Controller + DTO：`FavoriteController`（`/api/favorites/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaFavoriteRepository`
- [ ] Module 配線：`favorite.module.ts`
- [ ] 測試：各 Service.spec、favorite.e2e-spec

---

### notification 模組

參考：atago `src/adapter/in/web/notification/`、`src/application/service/notification/`

- [ ] Domain Model：`Notification`（id、userId、type、title、body、isRead、createdAt）
- [ ] Port/in：`SendNotificationUseCase`、`ListNotificationsUseCase`、`MarkReadUseCase`
- [ ] Port/out：（已有 `SendNotificationPort` in shared）`FindNotificationPort`、`SaveNotificationPort`
- [ ] Service：`SendNotificationService`、`ListNotificationsService`、`MarkReadService`
- [ ] Facade：`NotificationFacade`
- [ ] Controller + DTO：`NotificationController`（`/api/notifications/*`，含 `@ApiProperty`）
- [ ] Swagger：`@ApiOperation` / `@ApiResponse`，執行 `npm run swagger:bundle` 驗證
- [ ] Persistence Adapter：`PrismaNotificationRepository`
- [ ] Module 配線：`notification.module.ts`
- [ ] 測試：各 Service.spec、notification.e2e-spec

---

## 已完成

- **add-auth-module**（2026-05-01 完成）：完整 auth 模組，含 8 個端點、15 E2E tests、202 unit tests。
- **add-user-module**（2026-05-03 完成）：完整 user 模組，含 6 個端點（含頭像上傳/刪除）、11 E2E tests、214 unit tests。
