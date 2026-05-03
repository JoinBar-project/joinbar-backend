import { Inject, Injectable } from '@nestjs/common';
import {
  CreateEventCommand,
  CreateEventResult,
  CreateEventUseCase,
} from '../../port/in/event/CreateEventUseCase';
import {
  SAVE_EVENT_PORT,
  SaveEventPort,
} from '../../port/out/event/SaveEventPort';
import { FIND_TAG_PORT, FindTagPort } from '../../port/out/event/FindTagPort';
import { InvalidTagException } from '../../../domain/exception/InvalidTagException';

@Injectable()
export class CreateEventService implements CreateEventUseCase {
  constructor(
    @Inject(SAVE_EVENT_PORT) private readonly saveEvent: SaveEventPort,
    @Inject(FIND_TAG_PORT) private readonly findTag: FindTagPort,
  ) {}

  async execute(command: CreateEventCommand): Promise<CreateEventResult> {
    let tagIds: string[] | undefined;
    if (command.tags && command.tags.length > 0) {
      const found = await this.findTag.findByNames(command.tags);
      if (found.length !== command.tags.length) {
        throw new InvalidTagException();
      }
      tagIds = found.map((t) => t.id);
    }

    const event = await this.saveEvent.create({
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
      hostUser: command.hostUser,
      tagIds,
    });

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      barId: event.barId,
      barName: event.barName,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      maxPeople: event.maxPeople,
      imageUrl: event.imageUrl,
      price: event.price,
      hostUser: event.hostUser,
      tags: event.tags,
      participantCount: event.participantCount,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
