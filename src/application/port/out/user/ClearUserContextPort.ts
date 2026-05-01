export const CLEAR_USER_CONTEXT_PORT = 'CLEAR_USER_CONTEXT_PORT';

export interface ClearUserContextPort {
  /** 登出後清除該使用者的 UserContext 快取，強制下次請求重新查詢 */
  clearUserContext(userId: string): Promise<void>;
}
