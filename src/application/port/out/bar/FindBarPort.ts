export interface BarTagsData {
  sport: boolean;
  music: boolean;
  student: boolean;
  bistro: boolean;
  drink: boolean;
  joy: boolean;
  romantic: boolean;
  oldschool: boolean;
  highlevel: boolean;
  easy: boolean;
}

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
