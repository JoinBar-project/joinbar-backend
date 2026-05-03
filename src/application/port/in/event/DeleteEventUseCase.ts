export interface DeleteEventCommand {
  eventId: string;
  /** 當前操作者 userId，用於 ADMIN / hostUser 授權檢查 */
  actorId: string;
  actorRole: string;
}

export const DELETE_EVENT_USE_CASE = 'DELETE_EVENT_USE_CASE';

export interface DeleteEventUseCase {
  execute(command: DeleteEventCommand): Promise<void>;
}
