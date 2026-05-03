export interface EventData {
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

export interface FindManyEventsOptions {
  keyword?: string;
  tags?: string[];
  startFrom?: Date;
  startTo?: Date;
  barId?: string;
  skip: number;
  take: number;
}

export const FIND_EVENT_PORT = 'FIND_EVENT_PORT';

export interface FindEventPort {
  findById(eventId: string): Promise<EventData | null>;
  findMany(options: FindManyEventsOptions): Promise<EventData[]>;
  count(options: Omit<FindManyEventsOptions, 'skip' | 'take'>): Promise<number>;
  countParticipants(eventId: string): Promise<number>;
}
