import { z } from 'zod';

export const createMessageSchema = z.object({
  content: z.string().trim().min(1, 'content 不可為空'),
});

export type CreateMessageRequest = z.infer<typeof createMessageSchema>;
