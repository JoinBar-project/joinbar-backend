import { z } from 'zod';

export const createEventSchema = z
  .object({
    name: z.string().trim().min(1, 'name 不可為空').max(100),
    description: z.string().optional(),
    barId: z.string().uuid().optional(),
    barName: z.string().trim().min(1, 'barName 不可為空').max(300),
    location: z.string().trim().min(1, 'location 不可為空').max(300),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    maxPeople: z.number().int().positive().optional(),
    imageUrl: z.string().url().optional(),
    price: z.number().int().min(0).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: 'endAt 必須晚於 startAt',
    path: ['endAt'],
  });

export type CreateEventRequest = z.infer<typeof createEventSchema>;
