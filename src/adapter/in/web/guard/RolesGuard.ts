import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RoleName } from '../../../../domain/value-object/Role';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { UserContext } from '../decorator/current-user.decorator';

/**
 * 角色守衛：必須搭配 JwtAuthGuard 使用。
 * 未標註 @Roles() 的路由一律放行。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: UserContext }>();

    if (!requiredRoles.includes(request.user?.roleName as RoleName)) {
      throw new ForbiddenException('權限不足');
    }

    return true;
  }
}
