import { Inject, Injectable } from '@nestjs/common';
import {
  JoinEventCommand,
  JoinEventUseCase,
} from '../../port/in/event/JoinEventUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import {
  FIND_PARTICIPATION_PORT,
  FindParticipationPort,
} from '../../port/out/event/FindParticipationPort';
import {
  SAVE_PARTICIPATION_PORT,
  SaveParticipationPort,
} from '../../port/out/event/SaveParticipationPort';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { AlreadyJoinedException } from '../../../domain/exception/AlreadyJoinedException';

@Injectable()
export class JoinEventService implements JoinEventUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
    @Inject(FIND_PARTICIPATION_PORT)
    private readonly findParticipation: FindParticipationPort,
    @Inject(SAVE_PARTICIPATION_PORT)
    private readonly saveParticipation: SaveParticipationPort,
  ) {}

  async execute(command: JoinEventCommand): Promise<void> {
    const event = await this.findEvent.findById(command.eventId);
    if (!event) throw new EventNotFoundException();

    const existing = await this.findParticipation.findByUserAndEvent(
      command.userId,
      command.eventId,
    );
    if (existing) throw new AlreadyJoinedException();

    if (event.maxPeople !== null) {
      // createWithCapacityCheck 在事務中原子性地檢查人數並建立報名
      await this.saveParticipation.createWithCapacityCheck(
        command.userId,
        command.eventId,
        event.maxPeople,
      );
    } else {
      await this.saveParticipation.create(command.userId, command.eventId);
    }
  }
}
