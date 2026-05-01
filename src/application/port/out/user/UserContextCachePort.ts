export const USER_CONTEXT_CACHE_PORT = 'USER_CONTEXT_CACHE_PORT';

export interface UserContextCachePort {
  /** 取得 userId 對應的快取 UserContext（JSON 字串），未命中回傳 null */
  getByUserId(userId: string): Promise<string | null>;
  /** 寫入 UserContext 快取，TTL 配合 JWT 剩餘效期 */
  setByUserId(userId: string, value: string, ttlSeconds: number): Promise<void>;
  /** Redis 是否可用（快取未命中時用來決定是否記錄降級警告） */
  readonly isAvailable: boolean;
}
