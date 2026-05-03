import { MessageData } from './FindMessagePort';

export const SAVE_MESSAGE_PORT = 'SAVE_MESSAGE_PORT';

export interface SaveMessagePort {
  create(
    userId: string,
    eventId: string,
    content: string,
  ): Promise<MessageData>;
  softDelete(messageId: string): Promise<void>;
}
