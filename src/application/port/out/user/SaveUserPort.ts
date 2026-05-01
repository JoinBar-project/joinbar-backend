import { User } from '../../../../domain/model/User';
import { LineProviderData } from './FindUserPort';

export const SAVE_USER_PORT = 'SAVE_USER_PORT';

export interface SaveUserPort {
  /** 建立新 UserRecord + UserAuthProvider(EMAIL) */
  createWithEmailProvider(
    user: User,
    passwordHash: string,
    verifyToken?: string,
    verifyExpires?: Date,
  ): Promise<void>;

  /** 建立新 UserRecord + UserAuthProvider(LINE) */
  createWithLineProvider(user: User, lineData: LineProviderData): Promise<void>;

  /** 更新現有使用者的 LINE provider（upsert） */
  upsertLineProvider(userId: string, lineData: LineProviderData): Promise<void>;

  /** 更新 EMAIL provider 密碼，並記錄 lastPasswordChange */
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;

  /** 設定 EMAIL provider 驗證完成 */
  setEmailVerified(userId: string): Promise<void>;

  /** 更新帳號鎖定狀態（failedLoginCount + lockedAt） */
  updateLoginSecurity(
    userId: string,
    failedLoginCount: number,
    lockedAt: Date | null,
  ): Promise<void>;

  /** 更新最後登入時間（fire-and-forget） */
  updateLastLoginAt(userId: string): Promise<void>;
}
