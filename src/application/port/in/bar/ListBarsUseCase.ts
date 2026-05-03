import { PaginationMeta } from '../../../../infrastructure/pagination';

export interface ListBarsCommand {
  page?: number;
  limit?: number;
  keyword?: string;
  tags?: string[];
}

export interface BarListItem {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
}

export interface ListBarsResult {
  items: BarListItem[];
  meta: PaginationMeta;
}

export const LIST_BARS_USE_CASE = 'LIST_BARS_USE_CASE';

export interface ListBarsUseCase {
  execute(command: ListBarsCommand): Promise<ListBarsResult>;
}
