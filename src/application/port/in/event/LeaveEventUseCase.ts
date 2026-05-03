export interface LeaveEventCommand {
  eventId: string;
  userId: string;
}

export const LEAVE_EVENT_USE_CASE = 'LEAVE_EVENT_USE_CASE';

export interface LeaveEventUseCase {
  execute(command: LeaveEventCommand): Promise<void>;
}
