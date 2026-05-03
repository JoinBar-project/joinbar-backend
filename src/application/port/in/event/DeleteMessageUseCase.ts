export interface DeleteMessageCommand {
  eventId: string;
  messageId: string;
  /** 當前操作者 userId，用於本人 / ADMIN 授權檢查 */
  actorId: string;
  actorRole: string;
}

export const DELETE_MESSAGE_USE_CASE = 'DELETE_MESSAGE_USE_CASE';

export interface DeleteMessageUseCase {
  execute(command: DeleteMessageCommand): Promise<void>;
}
