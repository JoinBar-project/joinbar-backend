import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('請輸入有效的 Email')
    .max(100, 'Email 最多 100 字元'),
  password: z.string().min(1, '密碼為必填').max(128, '密碼最多 128 字元'),
  recaptchaToken: z.string().optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
