export interface GetEventCommand {
  eventId: string;
}

export interface EventDetail {
  id: string;
  name: string;
  description: string | null;
  barId: string | null;
  barName: string;
  location: string;
  startAt: Date;
  endAt: Date;
  maxPeople: number | null;
  imageUrl: string | null;
  price: number | null;
  hostUser: string;
  tags: string[];
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const GET_EVENT_USE_CASE = 'GET_EVENT_USE_CASE';

export interface GetEventUseCase {
  execute(command: GetEventCommand): Promise<EventDetail>;
}
