export interface UpdateProfileData {
  username?: string;
  nickname?: string;
  /** null 表示清除 birthday */
  birthday?: Date | null;
}

export interface UpdateAvatarData {
  avatarUrl: string;
  avatarKey: string;
  avatarLastUpdated: Date;
}

export const UPDATE_USER_PORT = 'UPDATE_USER_PORT';

export interface UpdateUserPort {
  /** 更新個人資料（username / nickname / birthday） */
  updateProfile(userId: string, data: UpdateProfileData): Promise<void>;
  /** 軟刪除：設定 deletedAt = now */
  softDelete(userId: string): Promise<void>;
  /** 更新頭像欄位（avatarUrl / avatarKey / avatarLastUpdated） */
  updateAvatar(userId: string, data: UpdateAvatarData): Promise<void>;
  /** 清空三個頭像欄位 */
  clearAvatar(userId: string): Promise<void>;
}
