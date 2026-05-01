import { z } from 'zod';

export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .email('請輸入有效的 Email')
    .max(100, 'Email 最多 100 字元'),
});

export type RequestPasswordResetRequest = z.infer<
  typeof requestPasswordResetSchema
>;
