import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  LineLoginCommand,
  LineLoginResult,
  LineLoginUseCase,
} from '../../port/in/auth/LineLoginUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import { SAVE_USER_PORT, SaveUserPort } from '../../port/out/user/SaveUserPort';
import {
  SAVE_AUTH_LOG_PORT,
  SaveAuthLogPort,
} from '../../port/out/auth/SaveAuthLogPort';
import {
  LINE_OAUTH_PORT,
  LineOAuthPort,
} from '../../port/out/auth/LineOAuthPort';
import { FeatureFlagService } from '../FeatureFlagService';
import { JwtPayload } from '../../port/jwt-payload';
import { getEnv } from '../../../infrastructure/validate-env';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';
import { User } from '../../../domain/model/User';
import { Email } from '../../../domain/value-object/Email';

@Injectable()
export class LineLoginService implements LineLoginUseCase {
  private readonly logger = new Logger(LineLoginService.name);

  constructor(
    @Inject(LINE_OAUTH_PORT) private readonly lineOAuth: LineOAuthPort,
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(SAVE_USER_PORT) private readonly saveUser: SaveUserPort,
    @Inject(SAVE_AUTH_LOG_PORT) private readonly saveAuthLog: SaveAuthLogPort,
    private readonly jwtService: JwtService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async execute(command: LineLoginCommand): Promise<LineLoginResult> {
    const { code, redirectUri, ip, userAgent } = command;
    const env = getEnv();

    // LINE code を token と交換し、プロフィールを取得
    const lineProfile = await this.lineOAuth.exchangeCodeForProfile(
      code,
      redirectUri,
    );

    // 既存 LINE ユーザーを検索
    let user = await this.findUser.findByProviderUid('LINE', lineProfile.uid);

    // LineUserProfile → LineProviderData の変換
    const lineData = {
      lineUid: lineProfile.uid,
      displayName: lineProfile.displayName,
      pictureUrl: lineProfile.pictureUrl,
      email: lineProfile.email,
      statusMessage: lineProfile.statusMessage,
    };

    if (user) {
      // 既存ユーザー：帳號狀態確認 + provider 資料更新
      if (!user.isActive()) {
        throw new AccountDisabledException();
      }
      await this.saveUser.upsertLineProvider(user.id, lineData);
    } else {
      // 新規ユーザー作成
      const emailObj = lineProfile.email ? Email.of(lineProfile.email) : null;
      user = User.create({
        id: randomUUID(),
        email: emailObj,
        username: lineProfile.displayName ?? `line_${lineProfile.uid}`,
      });
      await this.saveUser.createWithLineProvider(user, lineData);
    }

    // 双 token 署名
    const accessToken = this.jwtService.sign(
      { sub: user.id, type: 'access' } satisfies JwtPayload,
      { secret: env.ACCESS_SECRET, expiresIn: env.ACCESS_TOKEN_EXPIRES_IN },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' } satisfies JwtPayload,
      { secret: env.REFRESH_SECRET, expiresIn: env.REFRESH_TOKEN_EXPIRES_IN },
    );

    // 最後登入時間更新（fire-and-forget）
    this.saveUser.updateLastLoginAt(user.id).catch((err) => {
      this.logger.error('最後登入時間更新失敗', err);
    });

    await this.logAuth(user, lineProfile.email, ip, userAgent);

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

  /** 條件式記錄 LINE_LOGIN auth log（authLogEnabled 控制） */
  private async logAuth(
    user: User,
    lineEmail: string | null,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    if (!this.featureFlags.isEnabled('authLogEnabled')) return;
    try {
      await this.saveAuthLog.saveAuthLog({
        userId: user.id,
        email: user.email?.toString() ?? lineEmail ?? '',
        action: 'LINE_LOGIN',
        ipAddress: ip,
        userAgent,
      });
    } catch (err) {
      this.logger.error('LINE 登入日誌寫入失敗', err);
    }
  }
}
