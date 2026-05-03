import { PaginationMeta } from '../../../../infrastructure/pagination';

export interface ListEventsCommand {
  page?: number;
  limit?: number;
  keyword?: string;
  tags?: string[];
  startFrom?: Date;
  startTo?: Date;
  barId?: string;
}

export interface EventListItem {
  id: string;
  name: string;
  barId: string | null;
  barName: string;
  location: string;
  startAt: Date;
  endAt: Date;
  maxPeople: number | null;
  imageUrl: string | null;
  price: number | null;
  tags: string[];
  participantCount: number;
}

export interface ListEventsResult {
  items: EventListItem[];
  meta: PaginationMeta;
}

export const LIST_EVENTS_USE_CASE = 'LIST_EVENTS_USE_CASE';

export interface ListEventsUseCase {
  execute(command: ListEventsCommand): Promise<ListEventsResult>;
}
