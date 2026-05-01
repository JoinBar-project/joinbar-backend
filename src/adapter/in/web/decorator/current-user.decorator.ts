import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** 請求上下文中的完整使用者資訊（由 JwtAuthGuard 查 DB 後掛上） */
export interface UserContext {
  sub: string;
  email: string;
  roleName: string;
  permissions: string[];
  /** 帳號啟用狀態（false 時 Guard 會拒絕請求） */
  status: boolean;
  lastPasswordChange?: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { user: UserContext }).user;
  },
);
