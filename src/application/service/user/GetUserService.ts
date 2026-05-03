import { Inject, Injectable } from '@nestjs/common';
import {
  GetUserCommand,
  GetUserResult,
  GetUserUseCase,
} from '../../port/in/user/GetUserUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from '../../port/out/shared/FileStoragePort';
import { UserNotFoundException } from '../../../domain/exception/UserNotFoundException';

@Injectable()
export class GetUserService implements GetUserUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(FILE_STORAGE_PORT) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: GetUserCommand): Promise<GetUserResult> {
    const profile = await this.findUser.findProfileById(command.userId);
    if (!profile) throw new UserNotFoundException();

    // signed URL 有時效性，每次讀取時即時產生以避免回傳過期連結
    const avatarUrl = profile.avatarKey
      ? await this.fileStorage.getSignedUrl(profile.avatarKey)
      : null;

    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      nickname: profile.nickname,
      role: profile.role,
      birthday: profile.birthday,
      avatarUrl,
      createdAt: profile.createdAt,
    };
  }
}
