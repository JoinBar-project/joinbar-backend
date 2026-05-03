import { Inject, Injectable } from '@nestjs/common';
import {
  UpdateAvatarCommand,
  UpdateAvatarResult,
  UpdateAvatarUseCase,
} from '../../port/in/user/UpdateAvatarUseCase';
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
export class UpdateAvatarService implements UpdateAvatarUseCase {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: FindUserPort,
    @Inject(UPDATE_USER_PORT) private readonly updateUser: UpdateUserPort,
    @Inject(FILE_STORAGE_PORT) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: UpdateAvatarCommand): Promise<UpdateAvatarResult> {
    const { userId, fileBuffer, mimeType, originalName } = command;

    const profile = await this.findUser.findProfileById(userId);

    // 有舊頭像時先刪除
    if (profile?.avatarKey) {
      await this.fileStorage.delete(profile.avatarKey);
    }

    // 產生唯一 key 避免快取衝突
    const ext = originalName.split('.').pop() ?? 'bin';
    const avatarKey = `avatars/${userId}/${Date.now()}.${ext}`;

    await this.fileStorage.upload({
      key: avatarKey,
      buffer: fileBuffer,
      mimeType,
    });

    const avatarUrl = await this.fileStorage.getSignedUrl(avatarKey);

    await this.updateUser.updateAvatar(userId, {
      avatarUrl,
      avatarKey,
      avatarLastUpdated: new Date(),
    });

    return { avatarUrl };
  }
}
