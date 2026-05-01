import { z } from 'zod';

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1, 'Token 必填'),
  newPassword: z
    .string()
    .min(8, '密碼至少 8 個字元')
    .max(128, '密碼最多 128 字元'),
});

export type ConfirmPasswordResetRequest = z.infer<
  typeof confirmPasswordResetSchema
>;
