import { EventData } from './FindEventPort';

export interface CreateEventData {
  name: string;
  description?: string;
  barId?: string;
  barName: string;
  location: string;
  startAt: Date;
  endAt: Date;
  maxPeople?: number;
  imageUrl?: string;
  price?: number;
  hostUser: string;
  tagIds?: string[];
}

export interface UpdateEventData {
  name?: string;
  description?: string;
  barId?: string;
  barName?: string;
  location?: string;
  startAt?: Date;
  endAt?: Date;
  maxPeople?: number;
  imageUrl?: string;
  price?: number;
  /** 提供時整體覆寫 EventTag */
  tagIds?: string[];
}

export const SAVE_EVENT_PORT = 'SAVE_EVENT_PORT';

export interface SaveEventPort {
  create(data: CreateEventData): Promise<EventData>;
  update(eventId: string, data: UpdateEventData): Promise<EventData>;
  softDelete(eventId: string): Promise<void>;
}
