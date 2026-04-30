import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { FeatureFlagService } from '../../../../application/service/FeatureFlagService';
import {
  SESSION_ACTIVITY_PORT,
  SessionActivityPort,
} from '../../../../application/port/out/auth/SessionActivityPort';
import { UserContext } from '../decorator/current-user.decorator';
import { getEnv } from '../../../../infrastructure/validate-env';

/**
 * 全域 Guard：sessionIdleEnabled 開啟時，檢查認證使用者的 session 是否因閒置而過期。
 * 必須在 JwtAuthGuard 之後執行。對未認證路由直接放行。
 */
@Injectable()
export class SessionIdleGuard implements CanActivate {
  constructor(
    private readonly featureFlags: FeatureFlagService,
    @Inject(SESSION_ACTIVITY_PORT)
    private readonly sessionActivity: SessionActivityPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.featureFlags.isEnabled('sessionIdleEnabled')) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserContext }>();

    if (!request.user?.sub) return true;

    const isActive = await this.sessionActivity.isActive(request.user.sub);
    if (!isActive) {
      throw new UnauthorizedException('Session 已因閒置過久而過期，請重新登入');
    }

    await this.sessionActivity.touchActivity(
      request.user.sub,
      getEnv().APPLICATION_SESSION_IDLE_TIMEOUT,
    );
    return true;
  }
}
