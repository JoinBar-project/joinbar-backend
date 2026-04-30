export interface UserContextData {
  id: string;
  email: string;
  roleName: string;
  permissions: string[];
  /** 帳號啟用狀態（false = 停用，Guard 拒絕請求） */
  status: boolean;
  /** 最後一次更換密碼的時間（用於密碼定期更換檢查） */
  lastPasswordChange?: Date | null;
}

export const LOAD_USER_CONTEXT_PORT = 'LOAD_USER_CONTEXT_PORT';

export interface LoadUserContextPort {
  loadUserContext(userId: string): Promise<UserContextData | null>;
}
