export const BAR_TAG_KEYS = [
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

export type BarTagKey = (typeof BAR_TAG_KEYS)[number];

export type BarTagsData = Record<BarTagKey, boolean>;

export interface BarData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  barTag: BarTagsData | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FindManyBarsOptions {
  keyword?: string;
  tags?: string[];
  skip: number;
  take: number;
}

export const FIND_BAR_PORT = 'FIND_BAR_PORT';

export interface FindBarPort {
  findById(barId: string): Promise<BarData | null>;
  findMany(options: FindManyBarsOptions): Promise<BarData[]>;
  count(
    options: Pick<FindManyBarsOptions, 'keyword' | 'tags'>,
  ): Promise<number>;
}
