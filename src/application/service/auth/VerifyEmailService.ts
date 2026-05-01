import { Inject, Injectable } from '@nestjs/common';
import {
  VerifyEmailCommand,
  VerifyEmailUseCase,
} from '../../port/in/auth/VerifyEmailUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import { SAVE_USER_PORT, SaveUserPort } from '../../port/out/user/SaveUserPort';
import { InvalidEmailVerificationTokenException } from '../../../domain/exception/InvalidEmailVerificationTokenException';

@Injectable()
export class VerifyEmailService implements VerifyEmailUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(SAVE_USER_PORT) private readonly saveUser: SaveUserPort,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const { token } = command;

    const tokenData = await this.findUser.findByEmailVerifyToken(token);
    if (!tokenData) throw new InvalidEmailVerificationTokenException();

    if (
      tokenData.verifyExpires !== null &&
      tokenData.verifyExpires < new Date()
    ) {
      throw new InvalidEmailVerificationTokenException();
    }

    await this.saveUser.setEmailVerified(tokenData.userId);
  }
}
