import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  LOAD_USER_CONTEXT_PORT,
  LoadUserContextPort,
} from '../../../../application/port/out/user/LoadUserContextPort';
import {
  TOKEN_BLACKLIST_PORT,
  TokenBlacklistPort,
} from '../../../../application/port/out/auth/TokenBlacklistPort';
import {
  USER_CONTEXT_CACHE_PORT,
  UserContextCachePort,
} from '../../../../application/port/out/user/UserContextCachePort';
import { FeatureFlagService } from '../../../../application/service/FeatureFlagService';
import { JwtPayload } from '../../../../application/port/jwt-payload';
import { getEnv } from '../../../../infrastructure/validate-env';
import { UserContext } from '../decorator/current-user.decorator';
import { AccountDisabledException } from '../../../../domain/exception/AccountDisabledException';
import { PasswordChangeRequiredException } from '../../../../domain/exception/PasswordChangeRequiredException';

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwtExpiresIn = 0;
  private permissionCacheTtl = 0;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(TOKEN_BLACKLIST_PORT)
    private readonly tokenBlacklist: TokenBlacklistPort,
    @Inject(USER_CONTEXT_CACHE_PORT)
    private readonly userContextCache: UserContextCachePort,
    @Inject(LOAD_USER_CONTEXT_PORT)
    private readonly loadUserContext: LoadUserContextPort,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  onModuleInit(): void {
    const env = getEnv();
    this.jwtExpiresIn = env.ACCESS_TOKEN_EXPIRES_IN;
    this.permissionCacheTtl = env.PERMISSION_CACHE_TTL;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('缺少授權憑證，請先登入');

    if (await this.tokenBlacklist.isBlacklisted(token)) {
      this.logger.warn('Token 已在黑名單中');
      throw new UnauthorizedException('Token 已登出或失效');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token 驗證失敗');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token 類型不正確');
    }

    // 先嘗試從快取取得 UserContext
    const cached = await this.userContextCache.getByUserId(payload.sub);
    if (cached) {
      const cachedUser = JSON.parse(cached) as UserContext;
      if (!cachedUser.status) throw new AccountDisabledException();
      (request as Request & { user: UserContext }).user = cachedUser;
      this.checkPasswordExpiry(cachedUser);
      return true;
    }

    if (!this.userContextCache.isAvailable) {
      this.logger.warn('[JwtAuthGuard] Redis 不可用，UserContext 快取降級，每次請求直接查詢 DB');
    }

    const data = await this.loadUserContext.loadUserContext(payload.sub);
    if (!data) throw new UnauthorizedException('使用者不存在');
    if (!data.status) throw new AccountDisabledException();

    const userContext: UserContext = {
      sub: data.id,
      email: data.email,
      roleName: data.roleName,
      permissions: data.permissions,
      status: data.status,
      lastPasswordChange: data.lastPasswordChange
        ? data.lastPasswordChange.toISOString()
        : null,
    };

    (request as Request & { user: UserContext }).user = userContext;

    // 寫入快取，TTL 取 JWT 剩餘效期與 PERMISSION_CACHE_TTL 的最小值
    const now = Math.floor(Date.now() / 1000);
    const jwtTtl = payload.exp ? payload.exp - now : this.jwtExpiresIn;
    const ttl = Math.min(jwtTtl, this.permissionCacheTtl);
    if (ttl > 0) {
      await this.userContextCache.setByUserId(
        payload.sub,
        JSON.stringify(userContext),
        ttl,
      );
    }

    this.checkPasswordExpiry(userContext);
    return true;
  }

  private checkPasswordExpiry(user: UserContext): void {
    if (!this.featureFlags.isEnabled('passwordChangeEnabled')) return;

    const env = getEnv();
    const period = env.APPLICATION_PASSWORD_CHANGE_PERIOD;
    if (period <= 0) return;

    if (!user.lastPasswordChange) throw new PasswordChangeRequiredException();

    const lastChange = new Date(user.lastPasswordChange);
    const expiryDate = new Date(lastChange);
    expiryDate.setMonth(expiryDate.getMonth() + period);
    if (new Date() > expiryDate) throw new PasswordChangeRequiredException();
  }

  private readonly extractToken = (request: Request): string | null => {
    const auth = request.headers.authorization;
    return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  };
}
