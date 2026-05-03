export const SAVE_PARTICIPATION_PORT = 'SAVE_PARTICIPATION_PORT';

export interface SaveParticipationPort {
  create(userId: string, eventId: string): Promise<void>;
  /** 在事務中檢查人數後建立報名，超過上限時拋出 EventFullException */
  createWithCapacityCheck(
    userId: string,
    eventId: string,
    maxPeople: number,
  ): Promise<void>;
  delete(userId: string, eventId: string): Promise<void>;
}
