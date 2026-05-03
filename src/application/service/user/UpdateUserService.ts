import { Inject, Injectable } from '@nestjs/common';
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
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from '../../port/out/shared/FileStoragePort';
import { UserNotFoundException } from '../../../domain/exception/UserNotFoundException';

@Injectable()
export class UpdateUserService implements UpdateUserUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(UPDATE_USER_PORT) private readonly updateUser: UpdateUserPort,
    @Inject(FILE_STORAGE_PORT) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UpdateUserResult> {
    const { userId, username, nickname, birthday } = command;

    await this.updateUser.updateProfile(userId, {
      ...(username !== undefined && { username: username.trim() }),
      ...(nickname !== undefined && { nickname }),
      ...(birthday !== undefined && { birthday }),
    });

    // 重新查詢以回傳最新資料
    const updated = await this.findUser.findProfileById(userId);
    if (!updated) throw new UserNotFoundException();

    const avatarUrl = updated.avatarKey
      ? await this.fileStorage.getSignedUrl(updated.avatarKey)
      : null;

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      nickname: updated.nickname,
      role: updated.role,
      birthday: updated.birthday,
      avatarUrl,
      createdAt: updated.createdAt,
    };
  }
}
