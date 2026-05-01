import { z } from 'zod';

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token 必填'),
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
