export const TOKEN_BLACKLIST_PORT = 'TOKEN_BLACKLIST_PORT';

export interface TokenBlacklistPort {
  /** 將 token 加入黑名單，TTL 配合 JWT 剩餘效期 */
  addToBlacklist(token: string, ttlSeconds: number): Promise<void>;
  /** 檢查 token 是否在黑名單中（Redis 不可用時採 fail-closed，拋出 503） */
  isBlacklisted(token: string): Promise<boolean>;
}
