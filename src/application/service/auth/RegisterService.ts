import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  RegisterCommand,
  RegisterResult,
  RegisterUseCase,
} from '../../port/in/auth/RegisterUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import { SAVE_USER_PORT, SaveUserPort } from '../../port/out/user/SaveUserPort';
import {
  SEND_EMAIL_PORT,
  SendEmailPort,
} from '../../port/out/shared/SendEmailPort';
import { FeatureFlagService } from '../FeatureFlagService';
import { PasswordPolicyService } from '../PasswordPolicyService';
import { Email } from '../../../domain/value-object/Email';
import { User } from '../../../domain/model/User';
import { EmailAlreadyExistsException } from '../../../domain/exception/EmailAlreadyExistsException';
import { getEnv } from '../../../infrastructure/validate-env';

/** 驗證信有效期：24 小時 */
const VERIFY_EMAIL_EXPIRES_HOURS = 24;

@Injectable()
export class RegisterService implements RegisterUseCase {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(SAVE_USER_PORT) private readonly saveUser: SaveUserPort,
    @Inject(SEND_EMAIL_PORT) private readonly sendEmail: SendEmailPort,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const { email, password, username } = command;

    // email 格式驗證
    let emailObj: Email;
    try {
      emailObj = Email.of(email);
    } catch {
      throw new BadRequestException('Email 格式不正確');
    }

    // 密碼強度驗證
    this.passwordPolicy.validateOrThrow(password);

    // email 唯一性檢查
    const exists = await this.findUser.existsByEmail(email);
    if (exists) {
      throw new EmailAlreadyExistsException();
    }

    // 建立 Domain Entity
    const user = User.create({
      id: randomUUID(),
      email: emailObj,
      username,
    });

    // 密碼 hash
    const env = getEnv();
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const emailVerificationEnabled = this.featureFlags.isEnabled(
      'emailVerificationEnabled',
    );

    if (emailVerificationEnabled) {
      // 產生驗證 token（32 bytes hex = 64 chars）
      const verifyToken = randomBytes(32).toString('hex');
      const verifyExpires = new Date(
        Date.now() + VERIFY_EMAIL_EXPIRES_HOURS * 60 * 60 * 1000,
      );

      await this.saveUser.createWithEmailProvider(
        user,
        passwordHash,
        verifyToken,
        verifyExpires,
      );

      // 寄送驗證信（失敗不中斷主流程）
      await this.sendVerificationEmail(email, verifyToken, env.API_BASE_URL);

      return { verified: false };
    }

    await this.saveUser.createWithEmailProvider(user, passwordHash);
    return { verified: true };
  }

  private async sendVerificationEmail(
    to: string,
    token: string,
    baseUrl?: string,
  ): Promise<void> {
    try {
      const verifyUrl = baseUrl
        ? `${baseUrl}/api/auth/verify-email?token=${token}`
        : token;

      await this.sendEmail.sendMail({
        to,
        subject: '請驗證您的電子郵件',
        html: `<p>請點擊以下連結完成驗證：</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>此連結將在 ${VERIFY_EMAIL_EXPIRES_HOURS} 小時後失效。</p>`,
      });
    } catch (err) {
      this.logger.error('驗證信寄送失敗', err);
    }
  }
}
