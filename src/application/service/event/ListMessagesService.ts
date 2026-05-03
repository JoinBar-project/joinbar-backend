import { Inject, Injectable } from '@nestjs/common';
import {
  ListMessagesCommand,
  ListMessagesResult,
  ListMessagesUseCase,
} from '../../port/in/event/ListMessagesUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import {
  FIND_MESSAGE_PORT,
  FindMessagePort,
} from '../../port/out/event/FindMessagePort';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';

@Injectable()
export class ListMessagesService implements ListMessagesUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
    @Inject(FIND_MESSAGE_PORT) private readonly findMessage: FindMessagePort,
  ) {}

  async execute(command: ListMessagesCommand): Promise<ListMessagesResult> {
    const event = await this.findEvent.findById(command.eventId);
    if (!event) throw new EventNotFoundException();

    const messages = await this.findMessage.findByEventId(command.eventId);
    return {
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        userId: m.userId,
        createdAt: m.createdAt,
      })),
    };
  }
}
