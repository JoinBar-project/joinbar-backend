export const SAVE_PARTICIPATION_PORT = 'SAVE_PARTICIPATION_PORT';

export interface SaveParticipationPort {
  create(userId: string, eventId: string): Promise<void>;
  delete(userId: string, eventId: string): Promise<void>;
}
