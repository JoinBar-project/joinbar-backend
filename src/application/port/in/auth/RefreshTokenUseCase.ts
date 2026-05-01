export interface RefreshTokenCommand {
  refreshToken: string;
  /** 客戶端 IP */
  ip?: string;
  userAgent?: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  /** Access Token 絕對有效期（秒） */
  accessTokenExpiresIn: number;
}

export const REFRESH_TOKEN_USE_CASE = 'REFRESH_TOKEN_USE_CASE';

export interface RefreshTokenUseCase {
  execute(command: RefreshTokenCommand): Promise<RefreshTokenResult>;
}
