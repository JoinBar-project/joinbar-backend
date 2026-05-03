export const FIND_PARTICIPATION_PORT = 'FIND_PARTICIPATION_PORT';

export interface FindParticipationPort {
  findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<{ id: string } | null>;
}
