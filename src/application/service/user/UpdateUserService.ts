import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  UpdateUserCommand,
  UpdateUserResult,
  UpdateUserUseCase,
} from '../../port/in/user/UpdateUserUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import {
  UPDATE_USER_PORT,
  UpdateUserPort,
} from '../../port/out/user/UpdateUserPort';

@Injectable()
export class UpdateUserService implements UpdateUserUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(UPDATE_USER_PORT) private readonly updateUser: UpdateUserPort,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UpdateUserResult> {
    const { userId, username, nickname, birthday } = command;

    const hasAnyField =
      username !== undefined ||
      nickname !== undefined ||
      birthday !== undefined;
    if (!hasAnyField) {
      throw new BadRequestException('至少需提供一個更新欄位');
    }

    if (username !== undefined && username.trim().length === 0) {
      throw new BadRequestException('username 不可為空字串');
    }

    await this.updateUser.updateProfile(userId, {
      ...(username !== undefined && { username: username.trim() }),
      ...(nickname !== undefined && { nickname }),
      ...(birthday !== undefined && { birthday }),
    });

    // 重新查詢以回傳最新資料
    const updated = await this.findUser.findProfileById(userId);
    return {
      id: updated!.id,
      email: updated!.email,
      username: updated!.username,
      nickname: updated!.nickname,
      role: updated!.role,
      birthday: updated!.birthday,
      avatarUrl: updated!.avatarUrl,
      createdAt: updated!.createdAt,
    };
  }
}
