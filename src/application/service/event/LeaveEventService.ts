import { Inject, Injectable } from '@nestjs/common';
import {
  LeaveEventCommand,
  LeaveEventUseCase,
} from '../../port/in/event/LeaveEventUseCase';
import {
  FIND_PARTICIPATION_PORT,
  FindParticipationPort,
} from '../../port/out/event/FindParticipationPort';
import {
  SAVE_PARTICIPATION_PORT,
  SaveParticipationPort,
} from '../../port/out/event/SaveParticipationPort';
import { ParticipationNotFoundException } from '../../../domain/exception/ParticipationNotFoundException';

@Injectable()
export class LeaveEventService implements LeaveEventUseCase {
  constructor(
    @Inject(FIND_PARTICIPATION_PORT)
    private readonly findParticipation: FindParticipationPort,
    @Inject(SAVE_PARTICIPATION_PORT)
    private readonly saveParticipation: SaveParticipationPort,
  ) {}

  async execute(command: LeaveEventCommand): Promise<void> {
    const existing = await this.findParticipation.findByUserAndEvent(
      command.userId,
      command.eventId,
    );
    if (!existing) throw new ParticipationNotFoundException();

    await this.saveParticipation.delete(command.userId, command.eventId);
  }
}
