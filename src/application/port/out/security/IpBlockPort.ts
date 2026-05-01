export const IP_BLOCK_PORT = 'IP_BLOCK_PORT';

export interface IpBlockPort {
  /**
   * 記錄一次 IP 登入失敗，回傳目前累計次數
   * @param ip - 來源 IP
   */
  recordFailedIpAttempt(ip: string): Promise<number>;

  /**
   * 重置 IP 失敗計數
   * @param ip - 來源 IP
   */
  resetIpAttempts(ip: string): Promise<void>;
}
