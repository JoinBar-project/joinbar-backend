export interface MessageData {
  id: string;
  content: string;
  userId: string;
  eventId: string;
  createdAt: Date;
}

export const FIND_MESSAGE_PORT = 'FIND_MESSAGE_PORT';

export interface FindMessagePort {
  findByEventId(eventId: string): Promise<MessageData[]>;
  findById(messageId: string): Promise<MessageData | null>;
}
