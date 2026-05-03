export interface UpdateAvatarCommand {
  userId: string;
  /** 圖片 Buffer */
  fileBuffer: Buffer;
  /** MIME type，例如 image/jpeg */
  mimeType: string;
  /** 原始檔名（用於產生 Storage key） */
  originalName: string;
}

export interface UpdateAvatarResult {
  avatarUrl: string;
}

export const UPDATE_AVATAR_USE_CASE = 'UPDATE_AVATAR_USE_CASE';

export interface UpdateAvatarUseCase {
  execute(command: UpdateAvatarCommand): Promise<UpdateAvatarResult>;
}
