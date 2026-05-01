export interface PasswordResetTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export const PASSWORD_RESET_TOKEN_PORT = 'PASSWORD_RESET_TOKEN_PORT';

export interface PasswordResetTokenPort {
  createToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByToken(token: string): Promise<PasswordResetTokenData | null>;
  markUsed(tokenId: string): Promise<void>;
}
