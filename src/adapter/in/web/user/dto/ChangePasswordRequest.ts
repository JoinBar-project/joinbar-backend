import { z } from 'zod';

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '舊密碼為必填').max(128, '密碼最多 128 字元'),
  newPassword: z
    .string()
    .min(8, '新密碼至少 8 字元')
    .max(128, '密碼最多 128 字元'),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
