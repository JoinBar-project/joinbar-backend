import { z } from 'zod';

export const listEventsSchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    keyword: z.string().optional(),
    tags: z.string().optional(),
    startFrom: z.coerce.date().optional(),
    startTo: z.coerce.date().optional(),
    barId: z.string().uuid().optional(),
  })
  .transform((data) => ({
    ...data,
    tags: data.tags
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined,
  }));

export type ListEventsRequest = z.infer<typeof listEventsSchema>;
