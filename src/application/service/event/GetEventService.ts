import { Inject, Injectable } from '@nestjs/common';
import {
  EventDetail,
  GetEventCommand,
  GetEventUseCase,
} from '../../port/in/event/GetEventUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';

@Injectable()
export class GetEventService implements GetEventUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
  ) {}

  async execute(command: GetEventCommand): Promise<EventDetail> {
    const event = await this.findEvent.findById(command.eventId);
    if (!event) throw new EventNotFoundException();

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
