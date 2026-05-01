import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorator/permissions.decorator';
import { UserContext } from '../decorator/current-user.decorator';

/**
 * 權限守衛：必須搭配 JwtAuthGuard 使用（JwtAuthGuard 先跑，permissions 才存在）。
 * 未標註 @Permissions() 的路由一律放行。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: UserContext }>();

    const hasAll = required.every((code) =>
      (request.user?.permissions ?? []).includes(code),
    );

    if (!hasAll) throw new ForbiddenException('權限不足');
    return true;
  }
}
