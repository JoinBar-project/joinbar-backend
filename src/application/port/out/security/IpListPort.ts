export const IP_LIST_PORT = 'IP_LIST_PORT';

export interface IpListItem {
  id: string;
  ipAddress: string;
  description?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export interface IpBlacklistItem {
  id: string;
  ipAddress: string;
  reason?: string | null;
  isAutoBlock: boolean;
  createdBy?: string | null;
  createdAt: Date;
}

export interface IpListPort {
  /** 檢查 IP 是否在白名單中 */
  isWhitelisted(ip: string): Promise<boolean>;
  /** 檢查 IP 是否在黑名單中 */
  isBlacklisted(ip: string): Promise<boolean>;
  /** 新增 IP 到白名單 */
  addToWhitelist(
    ip: string,
    description?: string,
    createdBy?: string,
  ): Promise<void>;
  /** 新增 IP 到黑名單 */
  addToBlacklist(
    ip: string,
    reason?: string,
    isAutoBlock?: boolean,
    createdBy?: string,
  ): Promise<void>;
  /** 從白名單移除 IP */
  removeFromWhitelist(ip: string): Promise<void>;
  /** 從黑名單移除 IP */
  removeFromBlacklist(ip: string): Promise<void>;
  /** 查詢所有白名單 IP */
  listWhitelist(): Promise<IpListItem[]>;
  /** 查詢所有黑名單 IP */
  listBlacklist(): Promise<IpBlacklistItem[]>;
}
