import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GetUserCommand,
  GetUserResult,
  GetUserUseCase,
} from '../../port/in/user/GetUserUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';

@Injectable()
export class GetUserService implements GetUserUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
  ) {}

  async execute(command: GetUserCommand): Promise<GetUserResult> {
    const profile = await this.findUser.findProfileById(command.userId);
    if (!profile) throw new NotFoundException('使用者不存在');

    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      nickname: profile.nickname,
      role: profile.role,
      birthday: profile.birthday,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
    };
  }
}
