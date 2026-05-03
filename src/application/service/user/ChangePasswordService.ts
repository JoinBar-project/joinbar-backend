import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import {
  ChangePasswordCommand,
  ChangePasswordUseCase,
} from '../../port/in/user/ChangePasswordUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import { SAVE_USER_PORT, SaveUserPort } from '../../port/out/user/SaveUserPort';
import { PasswordPolicyService } from '../PasswordPolicyService';
import { NoEmailProviderException } from '../../../domain/exception/NoEmailProviderException';
import { getEnv } from '../../../infrastructure/validate-env';

@Injectable()
export class ChangePasswordService implements ChangePasswordUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(SAVE_USER_PORT) private readonly saveUser: SaveUserPort,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const { userId, oldPassword, newPassword } = command;

    // 確認使用者存在並有 email
    const user = await this.findUser.findById(userId);
    if (!user?.email) throw new NoEmailProviderException();

    // 確認 EMAIL provider 存在並取得密碼 hash
    const found = await this.findUser.findByEmailWithPassword(
      user.email.toString(),
    );
    if (!found) throw new NoEmailProviderException();

    // 驗證舊密碼
    const isMatch = await bcrypt.compare(oldPassword, found.passwordHash);
    if (!isMatch) throw new UnauthorizedException('舊密碼錯誤');

    // 驗證新密碼強度
    this.passwordPolicy.validateOrThrow(newPassword);

    // 更新密碼
    const env = getEnv();
    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await this.saveUser.updatePassword(userId, newHash);
  }
}
