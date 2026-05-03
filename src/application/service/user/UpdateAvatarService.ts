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
    const oldKey = profile?.avatarKey ?? null;

    // 產生唯一 key 避免快取衝突
    const extMatch = originalName.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1] : 'bin';
    const avatarKey = `avatars/${userId}/${Date.now()}.${ext}`;

    // 先上傳新檔，再更新 DB，最後刪除舊檔
    // 此順序確保 DB 失敗時舊資料不受影響
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

    if (oldKey) {
      // 舊頭像刪除失敗不影響主流程，可由定期清理任務補處理
      await this.fileStorage.delete(oldKey).catch(() => undefined);
    }

    return { avatarUrl };
  }
}
