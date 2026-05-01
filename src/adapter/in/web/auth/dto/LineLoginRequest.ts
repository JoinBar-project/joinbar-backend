import { z } from 'zod';

export const lineLoginSchema = z.object({
  code: z.string().min(1, 'LINE authorization code 必填'),
  redirectUri: z.string().url('redirectUri 必須為有效的 URL'),
});

export type LineLoginRequest = z.infer<typeof lineLoginSchema>;
