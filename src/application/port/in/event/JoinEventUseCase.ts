export interface JoinEventCommand {
  eventId: string;
  userId: string;
}

export const JOIN_EVENT_USE_CASE = 'JOIN_EVENT_USE_CASE';

export interface JoinEventUseCase {
  execute(command: JoinEventCommand): Promise<void>;
}
