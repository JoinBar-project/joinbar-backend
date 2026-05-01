import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LogoutCommand, LogoutUseCase } from '../../port/in/auth/LogoutUseCase';
import {
  TOKEN_BLACKLIST_PORT,
  TokenBlacklistPort,
} from '../../port/out/auth/TokenBlacklistPort';
import {
  CLEAR_USER_CONTEXT_PORT,
  ClearUserContextPort,
} from '../../port/out/user/ClearUserContextPort';
import {
  SAVE_AUTH_LOG_PORT,
  SaveAuthLogPort,
} from '../../port/out/auth/SaveAuthLogPort';
import { FeatureFlagService } from '../FeatureFlagService';
import { JwtPayload } from '../../port/jwt-payload';
import { getEnv } from '../../../infrastructure/validate-env';

/**
 * 登出處理：access / refresh 同時加入黑名單，並清除 UserContext 快取。
 */
@Injectable()
export class LogoutService implements LogoutUseCase {
  private readonly logger = new Logger(LogoutService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(TOKEN_BLACKLIST_PORT)
    private readonly tokenBlacklist: TokenBlacklistPort,
    @Inject(CLEAR_USER_CONTEXT_PORT)
    private readonly clearUserContext: ClearUserContextPort,
    @Inject(SAVE_AUTH_LOG_PORT)
    private readonly saveAuthLog: SaveAuthLogPort,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const env = getEnv();

    const accessPayload = this.verifySilently(command.accessToken, {
      secret: env.ACCESS_SECRET,
    });
    if (accessPayload) {
      const ttl = this.computeTtl(accessPayload, env.ACCESS_TOKEN_EXPIRES_IN);
      if (ttl > 0) {
        await this.tokenBlacklist.addToBlacklist(command.accessToken, ttl);
      }
      await this.clearUserContext.clearUserContext(accessPayload.sub);
      await this.logAuth(command, accessPayload.sub);
    }

    if (command.refreshToken && env.REFRESH_SECRET) {
      const refreshPayload = this.verifySilently(command.refreshToken, {
        secret: env.REFRESH_SECRET,
      });
      if (refreshPayload) {
        const ttl = this.computeTtl(
          refreshPayload,
          env.REFRESH_TOKEN_EXPIRES_IN,
        );
        if (ttl > 0) {
          await this.tokenBlacklist.addToBlacklist(command.refreshToken, ttl);
        }
      } else {
        this.logger.debug('Refresh token 驗證失敗（略過）');
      }
    }
  }

  /** 記錄 LOGOUT auth log（authLogEnabled 控制） */
  private async logAuth(command: LogoutCommand, userId: string): Promise<void> {
    if (!this.featureFlags.isEnabled('authLogEnabled')) return;
    try {
      await this.saveAuthLog.saveAuthLog({
        userId,
        email: command.email ?? '',
        action: 'LOGOUT',
        ipAddress: command.ip,
        userAgent: command.userAgent,
      });
    } catch (err) {
      this.logger.error('登出日誌寫入失敗', err);
    }
  }

  /** JWT 驗證失敗回傳 null（登出採 best-effort，不拋例外） */
  private verifySilently(
    token: string,
    options: { secret: string },
  ): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token, options);
    } catch {
      return null;
    }
  }

  private computeTtl(payload: JwtPayload, fallback: number): number {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? payload.exp - now : fallback;
  }
}
