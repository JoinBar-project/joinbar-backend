import { z } from 'zod';
import { barTagsSchema } from './BarTagsDto';

export const updateBarSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'name 不可為空')
      .max(100, 'name 最多 100 字元')
      .optional(),
    address: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    website: z.string().url().max(255).optional(),
    imageUrl: z.string().url().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    googlePlaceId: z.string().max(255).optional(),
    tags: barTagsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: '至少需提供一個更新欄位',
  });

export type UpdateBarRequest = z.infer<typeof updateBarSchema>;
