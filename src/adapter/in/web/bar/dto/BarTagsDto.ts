import { z } from 'zod';

export const VALID_BAR_TAGS = [
  'sport',
  'music',
  'student',
  'bistro',
  'drink',
  'joy',
  'romantic',
  'oldschool',
  'highlevel',
  'easy',
] as const;

export type BarTagName = (typeof VALID_BAR_TAGS)[number];

export const barTagsSchema = z.object({
  sport: z.boolean().optional(),
  music: z.boolean().optional(),
  student: z.boolean().optional(),
  bistro: z.boolean().optional(),
  drink: z.boolean().optional(),
  joy: z.boolean().optional(),
  romantic: z.boolean().optional(),
  oldschool: z.boolean().optional(),
  highlevel: z.boolean().optional(),
  easy: z.boolean().optional(),
});

export type BarTagsDto = z.infer<typeof barTagsSchema>;
