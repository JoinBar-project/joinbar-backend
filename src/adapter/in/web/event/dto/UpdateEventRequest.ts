import { z } from 'zod';

export const updateEventSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().optional(),
    barId: z.string().uuid().optional(),
    barName: z.string().trim().min(1).max(300).optional(),
    location: z.string().trim().min(1).max(300).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    maxPeople: z.number().int().positive().optional(),
    imageUrl: z.string().url().optional(),
    price: z.number().int().min(0).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: '至少需提供一個欄位',
  });

export type UpdateEventRequest = z.infer<typeof updateEventSchema>;
