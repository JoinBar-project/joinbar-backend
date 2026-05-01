import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token 必填'),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
