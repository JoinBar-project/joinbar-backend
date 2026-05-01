# 待辦事項

跨變更的待處理項目與延後功能。

## 進行中

- [ ] 完整重寫為 NestJS + TypeScript（六邊形架構）
- [ ] user/auth module 接入後，於需認證 controller 套用 `@UseGuards(JwtAuthGuard, SessionIdleGuard)` 或於 AppModule 統一註冊為 APP_GUARD（順序須在 Throttler / IpBlacklist / IpWhitelist 之後），並對公開路由加 `@Public()`。SessionIdleGuard 因依賴 `request.user`，目前暫時退出 APP_GUARD 列表。

## 已完成
