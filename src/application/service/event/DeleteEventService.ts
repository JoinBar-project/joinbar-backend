import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  DeleteEventCommand,
  DeleteEventUseCase,
} from '../../port/in/event/DeleteEventUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import {
  SAVE_EVENT_PORT,
  SaveEventPort,
} from '../../port/out/event/SaveEventPort';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { RoleName } from '../../../domain/value-object/Role';

@Injectable()
export class DeleteEventService implements DeleteEventUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
    @Inject(SAVE_EVENT_PORT) private readonly saveEvent: SaveEventPort,
  ) {}

  async execute(command: DeleteEventCommand): Promise<void> {
    const event = await this.findEvent.findById(command.eventId);
    if (!event) throw new EventNotFoundException();

    if (
      command.actorRole !== RoleName.ADMIN &&
      event.hostUser !== command.actorId
    ) {
      throw new ForbiddenException('僅 ADMIN 或活動主辦人可刪除活動');
    }

    await this.saveEvent.softDelete(command.eventId);
  }
}
