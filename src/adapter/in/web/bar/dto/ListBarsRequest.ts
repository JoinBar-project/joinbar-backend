import { z } from 'zod';
import { VALID_BAR_TAGS } from './BarTagsDto';

export const listBarsSchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    keyword: z.string().optional(),
    tags: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    tags: data.tags
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined,
  }))
  .refine(
    (data) =>
      !data.tags ||
      data.tags.every((tag) =>
        (VALID_BAR_TAGS as readonly string[]).includes(tag),
      ),
    {
      message: `tags 包含無效標籤，合法值：${VALID_BAR_TAGS.join(', ')}`,
    },
  );

export type ListBarsRequest = z.infer<typeof listBarsSchema>;
