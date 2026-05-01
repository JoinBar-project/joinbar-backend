import { SetMetadata } from '@nestjs/common';

/**
 * 標記不需要 JWT 認證的路由（讓全域 JwtAuthGuard 跳過）。
 * 用於登入、註冊、健康檢查等公開端點。
 */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
