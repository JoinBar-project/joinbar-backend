import { MessageItem } from './ListMessagesUseCase';

export interface CreateMessageCommand {
  eventId: string;
  userId: string;
  content: string;
}

export type MessageResult = MessageItem;

export const CREATE_MESSAGE_USE_CASE = 'CREATE_MESSAGE_USE_CASE';

export interface CreateMessageUseCase {
  execute(command: CreateMessageCommand): Promise<MessageResult>;
}
