import { z } from 'zod';
import { barTagsSchema } from './BarTagsDto';

export const createBarSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name 不可為空')
    .max(100, 'name 最多 100 字元'),
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().max(255).optional(),
  imageUrl: z.string().url().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  googlePlaceId: z.string().max(255).optional(),
  tags: barTagsSchema.optional(),
});

export type CreateBarRequest = z.infer<typeof createBarSchema>;
