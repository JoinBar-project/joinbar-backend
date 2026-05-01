export interface LineLoginCommand {
  /** LINE authorization code */
  code: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** 客戶端 IP */
  ip?: string;
  userAgent?: string;
}

export interface LineLoginResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: {
    id: string;
    email: string | null;
    username: string;
    role: string;
  };
}

export const LINE_LOGIN_USE_CASE = 'LINE_LOGIN_USE_CASE';

export interface LineLoginUseCase {
  execute(command: LineLoginCommand): Promise<LineLoginResult>;
}
