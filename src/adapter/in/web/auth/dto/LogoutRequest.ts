import { z } from 'zod';

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type LogoutRequest = z.infer<typeof logoutSchema>;
