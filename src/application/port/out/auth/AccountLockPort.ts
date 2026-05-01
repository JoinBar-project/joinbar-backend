export const ACCOUNT_LOCK_PORT = 'ACCOUNT_LOCK_PORT';

export interface AccountLockPort {
  /**
   * 記錄一次登入失敗，回傳目前累計失敗次數
   * @param email - 帳號 email
   */
  recordFailedLogin(email: string): Promise<number>;

  /**
   * 重置失敗計數（登入成功時呼叫）
   * @param email - 帳號 email
   */
  resetFailedLogin(email: string): Promise<void>;

  /**
   * 檢查帳號是否已被鎖定
   * @param email - 帳號 email
   */
  isLocked(email: string): Promise<boolean>;

  /**
   * 鎖定帳號
   * @param email - 帳號 email
   */
  lockAccount(email: string): Promise<void>;

  /**
   * 解鎖帳號（重置鎖定狀態與失敗計數）
   * @param email - 帳號 email
   */
  unlockAccount(email: string): Promise<void>;
}
