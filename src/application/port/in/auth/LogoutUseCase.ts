export interface LogoutCommand {
  /** Access Token（由 Bearer header 取出） */
  accessToken: string;
  /** Refresh Token（body 選填） */
  refreshToken?: string;
  /** 日誌用信箱（由 Controller 傳入） */
  email?: string;
  /** 客戶端 IP */
  ip?: string;
  userAgent?: string;
}

export const LOGOUT_USE_CASE = 'LOGOUT_USE_CASE';

export interface LogoutUseCase {
  execute(command: LogoutCommand): Promise<void>;
}
