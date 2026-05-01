import { User } from '../../../../domain/model/User';

export interface UserWithPassword {
  user: User;
  /** bcrypt hash，存於 UserAuthProvider(EMAIL) */
  passwordHash: string;
  /** UserAuthProvider row ID，更新時使用 */
  providerId: string;
}

export interface LineProviderData {
  lineUid: string;
  displayName: string | null;
  pictureUrl: string | null;
  email: string | null;
  statusMessage: string | null;
}

export interface EmailVerifyTokenData {
  userId: string;
  verifyExpires: Date | null;
}

export const FIND_USER_PORT = 'FIND_USER_PORT';

export interface FindUserPort {
  /** Email 登入用：找到使用者及其 EMAIL provider 密碼 */
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  /** LINE / OAuth 登入用：依 provider uid 查詢 */
  findByProviderUid(
    provider: 'LINE' | 'GOOGLE',
    uid: string,
  ): Promise<User | null>;
  /** 依 userId 查詢（RefreshToken、一般操作用） */
  findById(userId: string): Promise<User | null>;
  /** 檢查 EMAIL provider 是否已存在（註冊用） */
  existsByEmail(email: string): Promise<boolean>;
  /** Email 驗證 token 查詢（VerifyEmail 用） */
  findByEmailVerifyToken(token: string): Promise<EmailVerifyTokenData | null>;
}
