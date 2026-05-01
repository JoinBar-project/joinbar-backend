import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('請輸入有效的 Email')
    .max(100, 'Email 最多 100 字元'),
  password: z
    .string()
    .min(8, '密碼至少 8 個字元')
    .max(128, '密碼最多 128 字元'),
  username: z
    .string()
    .trim()
    .min(1, '使用者名稱為必填')
    .max(50, '使用者名稱最多 50 字元'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
