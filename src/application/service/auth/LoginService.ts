import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import {
  LoginCommand,
  LoginResult,
  LoginUseCase,
} from '../../port/in/auth/LoginUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import { SAVE_USER_PORT, SaveUserPort } from '../../port/out/user/SaveUserPort';
import {
  SAVE_AUTH_LOG_PORT,
  SaveAuthLogPort,
} from '../../port/out/auth/SaveAuthLogPort';
import {
  ACCOUNT_LOCK_PORT,
  AccountLockPort,
} from '../../port/out/auth/AccountLockPort';
import {
  IP_BLOCK_PORT,
  IpBlockPort,
} from '../../port/out/security/IpBlockPort';
import { IP_LIST_PORT, IpListPort } from '../../port/out/security/IpListPort';
import {
  RECAPTCHA_VERIFY_PORT,
  RecaptchaVerifyPort,
} from '../../port/out/auth/RecaptchaVerifyPort';
import {
  SESSION_ACTIVITY_PORT,
  SessionActivityPort,
} from '../../port/out/auth/SessionActivityPort';
import { FeatureFlagService } from '../FeatureFlagService';
import { JwtPayload } from '../../port/jwt-payload';
import { getEnv } from '../../../infrastructure/validate-env';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';

@Injectable()
export class LoginService implements LoginUseCase {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(SAVE_USER_PORT) private readonly saveUser: SaveUserPort,
    @Inject(SAVE_AUTH_LOG_PORT) private readonly saveAuthLog: SaveAuthLogPort,
    @Inject(ACCOUNT_LOCK_PORT) private readonly accountLock: AccountLockPort,
    @Inject(IP_BLOCK_PORT) private readonly ipBlock: IpBlockPort,
    @Inject(IP_LIST_PORT) private readonly ipList: IpListPort,
    @Inject(RECAPTCHA_VERIFY_PORT)
    private readonly recaptcha: RecaptchaVerifyPort,
    @Inject(SESSION_ACTIVITY_PORT)
    private readonly sessionActivity: SessionActivityPort,
    private readonly jwtService: JwtService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const { email, password, ip, userAgent, recaptchaToken } = command;
    const env = getEnv();

    // reCAPTCHA 驗證
    if (this.featureFlags.isEnabled('googleRecaptchaEnabled')) {
      if (!recaptchaToken) {
        throw new UnauthorizedException('請完成 reCAPTCHA 驗證');
      }
      const passed = await this.recaptcha.verify(recaptchaToken, ip);
      if (!passed) throw new UnauthorizedException('reCAPTCHA 驗證失敗');
    }

    // 帳號鎖定檢查（查 DB lockedAt）
    if (this.featureFlags.isEnabled('accountLockEnabled')) {
      if (await this.accountLock.isLocked(email)) {
        await this.logAuth(
          email,
          undefined,
          'LOGIN_FAILURE',
          ip,
          userAgent,
          '帳號已鎖定',
        );
        throw new ForbiddenException('帳號已被鎖定，請聯繫管理員解鎖');
      }
    }

    const found = await this.findUser.findByEmailWithPassword(email);
    if (!found) {
      await this.handleLoginFailure(email, ip, userAgent, '帳號不存在');
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const { user, passwordHash } = found;

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      await this.handleLoginFailure(email, ip, userAgent, '密碼錯誤');
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    // 帳號狀態檢查（放在 bcrypt 後避免 user enumeration）
    if (!user.isActive()) {
      await this.logAuth(
        email,
        user.id,
        'LOGIN_FAILURE',
        ip,
        userAgent,
        '帳號已停用',
      );
      throw new AccountDisabledException();
    }

    // 登入成功：重置失敗計數
    if (this.featureFlags.isEnabled('accountLockEnabled')) {
      await this.accountLock.resetFailedLogin(email);
    }
    if (ip) {
      await this.ipBlock.resetIpAttempts(ip);
    }

    // 簽發雙 token（access / refresh 使用不同 secret）
    const accessToken = this.jwtService.sign(
      { sub: user.id, type: 'access' } satisfies JwtPayload,
      { secret: env.ACCESS_SECRET, expiresIn: env.ACCESS_TOKEN_EXPIRES_IN },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' } satisfies JwtPayload,
      { secret: env.REFRESH_SECRET, expiresIn: env.REFRESH_TOKEN_EXPIRES_IN },
    );

    // 初始化 session 活動追蹤
    if (this.featureFlags.isEnabled('sessionIdleEnabled')) {
      await this.sessionActivity.touchActivity(
        user.id,
        env.APPLICATION_SESSION_IDLE_TIMEOUT,
      );
    }

    // 更新最後登入時間（fire-and-forget）
    this.saveUser.updateLastLoginAt(user.id).catch((err) => {
      this.logger.error('最後登入時間更新失敗', err);
    });

    await this.logAuth(email, user.id, 'LOGIN_SUCCESS', ip, userAgent);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
      refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email?.toString() ?? null,
        username: user.username,
        role: user.role,
      },
    };
  }

  /** 登入失敗：帳號鎖定計數 + IP 封鎖計數 + 日誌 */
  private async handleLoginFailure(
    email: string,
    ip?: string,
    userAgent?: string,
    detail?: string,
  ): Promise<void> {
    if (this.featureFlags.isEnabled('accountLockEnabled')) {
      const env = getEnv();
      const failCount = await this.accountLock.recordFailedLogin(email);
      if (failCount >= env.APPLICATION_ACCOUNT_LOCK_THRESHOLD) {
        await this.accountLock.lockAccount(email);
        this.logger.warn(`帳號 ${email} 因連續 ${failCount} 次失敗已鎖定`);
      }
    }

    if (ip && this.featureFlags.isEnabled('ipBlacklistEnabled')) {
      const env = getEnv();
      const ipFailCount = await this.ipBlock.recordFailedIpAttempt(ip);
      if (ipFailCount >= env.APPLICATION_IP_BLOCK_THRESHOLD) {
        await this.ipList.addToBlacklist(
          ip,
          `自動封鎖：連續 ${ipFailCount} 次登入失敗`,
          true,
        );
        this.logger.warn(`IP ${ip} 已自動加入黑名單`);
      }
    }

    await this.logAuth(
      email,
      undefined,
      'LOGIN_FAILURE',
      ip,
      userAgent,
      detail,
    );
  }

  /** 條件式記錄 auth log（authLogEnabled 控制） */
  private async logAuth(
    email: string,
    userId: string | undefined,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE',
    ip?: string,
    userAgent?: string,
    detail?: string,
  ): Promise<void> {
    if (!this.featureFlags.isEnabled('authLogEnabled')) return;
    try {
      await this.saveAuthLog.saveAuthLog({
        email,
        userId,
        action,
        ipAddress: ip,
        userAgent,
        detail,
      });
    } catch (err) {
      this.logger.error('登入日誌寫入失敗', err);
    }
  }
}
