import { EventDetail } from './GetEventUseCase';

export interface UpdateEventCommand {
  eventId: string;
  /** 當前操作者 userId，用於 ADMIN / hostUser 授權檢查 */
  actorId: string;
  actorRole: string;
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
  tags?: string[];
}

export type UpdateEventResult = EventDetail;

export const UPDATE_EVENT_USE_CASE = 'UPDATE_EVENT_USE_CASE';

export interface UpdateEventUseCase {
  execute(command: UpdateEventCommand): Promise<UpdateEventResult>;
}
