import { BarListItem } from '../../../../../application/port/in/bar/ListBarsUseCase';
import { PaginationMeta } from '../../../../../infrastructure/pagination';

export class BarListResponse {
  items!: BarListItem[];
  meta!: PaginationMeta;
}
