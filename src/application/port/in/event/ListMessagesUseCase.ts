export interface ListMessagesCommand {
  eventId: string;
}

export interface MessageItem {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
}

export interface ListMessagesResult {
  messages: MessageItem[];
}

export const LIST_MESSAGES_USE_CASE = 'LIST_MESSAGES_USE_CASE';

export interface ListMessagesUseCase {
  execute(command: ListMessagesCommand): Promise<ListMessagesResult>;
}
