import { Inject, Injectable } from '@nestjs/common';
import {
  CreateMessageCommand,
  CreateMessageUseCase,
  MessageResult,
} from '../../port/in/event/CreateMessageUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import {
  SAVE_MESSAGE_PORT,
  SaveMessagePort,
} from '../../port/out/event/SaveMessagePort';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';

@Injectable()
export class CreateMessageService implements CreateMessageUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
    @Inject(SAVE_MESSAGE_PORT) private readonly saveMessage: SaveMessagePort,
  ) {}

  async execute(command: CreateMessageCommand): Promise<MessageResult> {
    const event = await this.findEvent.findById(command.eventId);
    if (!event) throw new EventNotFoundException();

    const message = await this.saveMessage.create(
      command.userId,
      command.eventId,
      command.content,
    );

    return {
      id: message.id,
      content: message.content,
      userId: message.userId,
      createdAt: message.createdAt,
    };
  }
}
