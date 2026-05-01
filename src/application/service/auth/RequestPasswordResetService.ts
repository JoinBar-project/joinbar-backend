import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  RequestPasswordResetCommand,
  RequestPasswordResetUseCase,
} from '../../port/in/auth/PasswordResetUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import {
  PASSWORD_RESET_TOKEN_PORT,
  PasswordResetTokenPort,
} from '../../port/out/auth/PasswordResetTokenPort';
import {
  SEND_EMAIL_PORT,
  SendEmailPort,
} from '../../port/out/shared/SendEmailPort';
import { getEnv } from '../../../infrastructure/validate-env';

@Injectable()
export class RequestPasswordResetService implements RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetService.name);

  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(PASSWORD_RESET_TOKEN_PORT)
    private readonly resetToken: PasswordResetTokenPort,
    @Inject(SEND_EMAIL_PORT) private readonly sendEmail: SendEmailPort,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const { email } = command;
    const env = getEnv();

    // セキュリティ：email の存在は外部に漏らさない（常に正常終了）
    const found = await this.findUser.findByEmailWithPassword(email);
    if (!found || !found.user.isActive()) return;

    const { user } = found;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + env.APP_PASSWORD_RESET_TOKEN_EXPIRES_IN * 60 * 1000,
    );

    await this.resetToken.createToken(user.id, token, expiresAt);

    await this.sendResetEmail(email, token, env.APP_PASSWORD_RESET_URL);
  }

  private async sendResetEmail(
    to: string,
    token: string,
    resetUrl?: string,
  ): Promise<void> {
    try {
      const link = resetUrl ? `${resetUrl}?token=${token}` : token;
      await this.sendEmail.sendMail({
        to,
        subject: '密碼重設請求',
        html: `<p>請點擊以下連結重設您的密碼：</p><p><a href="${link}">${link}</a></p><p>此連結將在 ${30} 分鐘後失效。</p>`,
      });
    } catch (err) {
      this.logger.error('密碼重設信寄送失敗', err);
    }
  }
}
