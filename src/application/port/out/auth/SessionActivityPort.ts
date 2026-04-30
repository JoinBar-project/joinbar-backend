export const SESSION_ACTIVITY_PORT = 'SESSION_ACTIVITY_PORT';

export interface SessionActivityPort {
  /**
   * 更新最後活動時間（每次認證請求時呼叫）
   * @param userId - 使用者 ID
   * @param ttlMinutes - TTL（分鐘），超過後 key 自動消失
   */
  touchActivity(userId: string, ttlMinutes: number): Promise<void>;

  /**
   * 檢查 session 是否仍活躍（key 存在 = 活躍）
   * @param userId - 使用者 ID
   */
  isActive(userId: string): Promise<boolean>;
}
