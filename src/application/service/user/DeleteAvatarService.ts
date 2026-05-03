import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteAvatarCommand,
  DeleteAvatarUseCase,
} from '../../port/in/user/DeleteAvatarUseCase';
import { FIND_USER_PORT, FindUserPort } from '../../port/out/user/FindUserPort';
import {
  UPDATE_USER_PORT,
  UpdateUserPort,
} from '../../port/out/user/UpdateUserPort';
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from '../../port/out/shared/FileStoragePort';

@Injectable()
export class DeleteAvatarService implements DeleteAvatarUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(UPDATE_USER_PORT) private readonly updateUser: UpdateUserPort,
    @Inject(FILE_STORAGE_PORT) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: DeleteAvatarCommand): Promise<void> {
    const profile = await this.findUser.findProfileById(command.userId);

    // 無頭像時冪等回傳
    if (!profile?.avatarKey) return;

    await this.fileStorage.delete(profile.avatarKey);
    await this.updateUser.clearAvatar(command.userId);
  }
}
