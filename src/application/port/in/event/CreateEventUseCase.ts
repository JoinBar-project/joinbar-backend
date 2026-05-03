import { EventDetail } from './GetEventUseCase';

export interface CreateEventCommand {
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
  tags?: string[];
  /** 建立者 userId，由 controller 注入 */
  hostUser: string;
}

export type CreateEventResult = EventDetail;

export const CREATE_EVENT_USE_CASE = 'CREATE_EVENT_USE_CASE';

export interface CreateEventUseCase {
  execute(command: CreateEventCommand): Promise<CreateEventResult>;
}
