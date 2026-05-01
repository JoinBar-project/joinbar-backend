import { Email } from '../value-object/Email';
import { RoleName } from '../value-object/Role';

/**
 * ユーザー Domain Entity / 使用者 Domain Entity
 *
 * 業務不變條件：
 * - username 不可為空白
 * - email は nullable（LINE ログインユーザーは email なし / LINE 登入使用者可無 email）
 * - role 預設 USER
 * - deletedAt が null の場合のみアクティブ / deletedAt 為 null 才算啟用中
 */
export class User {
  private constructor(
    readonly id: string,
    private _email: Email | null,
    private _username: string,
    private _nickname: string | null,
    private _role: RoleName,
    private _failedLoginCount: number,
    private _lockedAt: Date | null,
    private _lastPasswordChange: Date | null,
    readonly deletedAt: Date | null,
    readonly createdAt: Date,
  ) {}

  /** 新規ユーザー作成 / 建立新使用者（EMAIL 或 LINE 首次登入） */
  static create(params: {
    id: string;
    email: Email | null;
    username: string;
    nickname?: string | null;
    role?: RoleName;
  }): User {
    if (!params.username || params.username.trim().length === 0) {
      throw new Error('username 不可為空白');
    }
    return new User(
      params.id,
      params.email,
      params.username.trim(),
      params.nickname ?? null,
      params.role ?? RoleName.USER,
      0,
      null,
      null,
      null,
      new Date(),
    );
  }

  /** 從持久層重建（不觸發業務邏輯） */
  static reconstitute(params: {
    id: string;
    email: string | null;
    username: string;
    nickname: string | null;
    role: RoleName;
    failedLoginCount: number;
    lockedAt: Date | null;
    lastPasswordChange: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  }): User {
    return new User(
      params.id,
      params.email ? Email.of(params.email) : null,
      params.username,
      params.nickname,
      params.role,
      params.failedLoginCount,
      params.lockedAt,
      params.lastPasswordChange,
      params.deletedAt,
      params.createdAt,
    );
  }

  /** アカウントがアクティブか / 帳號是否啟用中（未軟刪除） */
  isActive(): boolean {
    return this.deletedAt === null;
  }

  /** アカウントがロックされているか / 帳號是否被鎖定 */
  isLocked(): boolean {
    return this._lockedAt !== null;
  }

  /** ログイン失敗カウントを増やす / 登入失敗計數 +1 */
  incrementFailedLogin(): void {
    this._failedLoginCount += 1;
  }

  /** ログイン失敗カウントをリセット / 重置登入失敗計數 */
  resetFailedLogin(): void {
    this._failedLoginCount = 0;
  }

  /** アカウントをロック / 鎖定帳號 */
  lock(): void {
    this._lockedAt = new Date();
  }

  /**
   * パスワードが期限切れかを確認 / 檢查密碼是否已過期
   *
   * 語意說明：`lastPasswordChange` 為 null（從未設定過）時，回傳 false（視為未過期）。
   * 這適用於 EMAIL 新用戶建立帳號時的初始狀態；若需對舊帳號強制輪換，
   * 應在呼叫端以 null → 需強制修改 的邏輯另行判斷。
   */
  isPasswordExpired(periodMonths: number): boolean {
    if (!this._lastPasswordChange) return false;
    const expireDate = new Date(this._lastPasswordChange);
    expireDate.setMonth(expireDate.getMonth() + periodMonths);
    return new Date() > expireDate;
  }

  /** パスワード変更時刻を更新 / 更新密碼修改時間 */
  recordPasswordChange(): void {
    this._lastPasswordChange = new Date();
  }

  get email(): Email | null {
    return this._email;
  }

  get username(): string {
    return this._username;
  }

  get nickname(): string | null {
    return this._nickname;
  }

  get role(): RoleName {
    return this._role;
  }

  get failedLoginCount(): number {
    return this._failedLoginCount;
  }

  get lockedAt(): Date | null {
    return this._lockedAt;
  }

  get lastPasswordChange(): Date | null {
    return this._lastPasswordChange;
  }
}
