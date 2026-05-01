import { Inject, Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcrypt';
import {
  ConfirmPasswordResetCommand,
  ConfirmPasswordResetUseCase,
} from '../../port/in/auth/PasswordResetUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import { SAVE_USER_PORT, SaveUserPort } from '../../port/out/user/SaveUserPort';
import {
  PASSWORD_RESET_TOKEN_PORT,
  PasswordResetTokenPort,
} from '../../port/out/auth/PasswordResetTokenPort';
import {
  CLEAR_USER_CONTEXT_PORT,
  ClearUserContextPort,
} from '../../port/out/user/ClearUserContextPort';
import {
  SAVE_AUTH_LOG_PORT,
  SaveAuthLogPort,
} from '../../port/out/auth/SaveAuthLogPort';
import { FeatureFlagService } from '../FeatureFlagService';
import { PasswordPolicyService } from '../PasswordPolicyService';
import { InvalidPasswordResetTokenException } from '../../../domain/exception/InvalidPasswordResetTokenException';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';
import { getEnv } from '../../../infrastructure/validate-env';

@Injectable()
export class ConfirmPasswordResetService implements ConfirmPasswordResetUseCase {
  private readonly logger = new Logger(ConfirmPasswordResetService.name);

  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(SAVE_USER_PORT) private readonly saveUser: SaveUserPort,
    @Inject(PASSWORD_RESET_TOKEN_PORT)
    private readonly resetToken: PasswordResetTokenPort,
    @Inject(CLEAR_USER_CONTEXT_PORT)
    private readonly clearUserContext: ClearUserContextPort,
    @Inject(SAVE_AUTH_LOG_PORT) private readonly saveAuthLog: SaveAuthLogPort,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async execute(command: ConfirmPasswordResetCommand): Promise<void> {
    const { token, newPassword } = command;

    // token 驗證
    const tokenData = await this.resetToken.findByToken(token);
    if (!tokenData) throw new InvalidPasswordResetTokenException();
    if (tokenData.usedAt) throw new InvalidPasswordResetTokenException();
    if (tokenData.expiresAt < new Date())
      throw new InvalidPasswordResetTokenException();

    // 帳號狀態確認
    const user = await this.findUser.findById(tokenData.userId);
    if (!user || !user.isActive()) throw new AccountDisabledException();

    // 密碼強度驗證
    this.passwordPolicy.validateOrThrow(newPassword);

    // 密碼更新
    const env = getEnv();
    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await this.saveUser.updatePassword(tokenData.userId, newHash);

    // token 使用後作廢
    await this.resetToken.markUsed(tokenData.id);

    // 強制登出（清除 UserContext 快取）
    if (env.APPLICATION_IS_LOGOUT_AFTER_PASSWORD_RESET) {
      await this.clearUserContext.clearUserContext(tokenData.userId);
    }

    await this.logAuth(user.email?.toString() ?? '', tokenData.userId);
  }

  /** 條件式記錄 PASSWORD_RESET auth log（authLogEnabled 控制） */
  private async logAuth(email: string, userId: string): Promise<void> {
    if (!this.featureFlags.isEnabled('authLogEnabled')) return;
    try {
      await this.saveAuthLog.saveAuthLog({
        userId,
        email,
        action: 'PASSWORD_RESET',
      });
    } catch (err) {
      this.logger.error('密碼重設日誌寫入失敗', err);
    }
  }
}
