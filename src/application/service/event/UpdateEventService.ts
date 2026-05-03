import { Inject, Injectable } from '@nestjs/common';
import {
  UpdateEventCommand,
  UpdateEventResult,
  UpdateEventUseCase,
} from '../../port/in/event/UpdateEventUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import {
  SAVE_EVENT_PORT,
  SaveEventPort,
} from '../../port/out/event/SaveEventPort';
import { FIND_TAG_PORT, FindTagPort } from '../../port/out/event/FindTagPort';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { ForbiddenOperationException } from '../../../domain/exception/ForbiddenOperationException';
import { InvalidTagException } from '../../../domain/exception/InvalidTagException';
import { RoleName } from '../../../domain/value-object/Role';

@Injectable()
export class UpdateEventService implements UpdateEventUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
    @Inject(SAVE_EVENT_PORT) private readonly saveEvent: SaveEventPort,
    @Inject(FIND_TAG_PORT) private readonly findTag: FindTagPort,
  ) {}

  async execute(command: UpdateEventCommand): Promise<UpdateEventResult> {
    const existing = await this.findEvent.findById(command.eventId);
    if (!existing) throw new EventNotFoundException();

    if (
      command.actorRole !== RoleName.ADMIN &&
      existing.hostUser !== command.actorId
    ) {
      throw new ForbiddenOperationException('僅 ADMIN 或活動主辦人可更新活動');
    }

    let tagIds: string[] | undefined;
    if (command.tags !== undefined) {
      const found = await this.findTag.findByNames(command.tags);
      if (found.length !== command.tags.length) {
        throw new InvalidTagException();
      }
      tagIds = found.map((t) => t.id);
    }

    const updated = await this.saveEvent.update(command.eventId, {
      name: command.name,
      description: command.description,
      barId: command.barId,
      barName: command.barName,
      location: command.location,
      startAt: command.startAt,
      endAt: command.endAt,
      maxPeople: command.maxPeople,
      imageUrl: command.imageUrl,
      price: command.price,
      tagIds,
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      barId: updated.barId,
      barName: updated.barName,
      location: updated.location,
      startAt: updated.startAt,
      endAt: updated.endAt,
      maxPeople: updated.maxPeople,
      imageUrl: updated.imageUrl,
      price: updated.price,
      hostUser: updated.hostUser,
      tags: updated.tags,
      participantCount: updated.participantCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
