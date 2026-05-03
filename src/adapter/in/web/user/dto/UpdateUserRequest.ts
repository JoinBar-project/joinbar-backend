import { z } from 'zod';

export const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'username 不可為空字串')
      .max(100, 'username 最多 100 字元')
      .optional(),
    nickname: z.string().max(100, 'nickname 最多 100 字元').optional(),
    birthday: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: '至少需提供一個更新欄位',
  });

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
