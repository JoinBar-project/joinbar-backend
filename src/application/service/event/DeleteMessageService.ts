import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  DeleteMessageCommand,
  DeleteMessageUseCase,
} from '../../port/in/event/DeleteMessageUseCase';
import {
  FIND_MESSAGE_PORT,
  FindMessagePort,
} from '../../port/out/event/FindMessagePort';
import {
  SAVE_MESSAGE_PORT,
  SaveMessagePort,
} from '../../port/out/event/SaveMessagePort';
import { MessageNotFoundException } from '../../../domain/exception/MessageNotFoundException';
import { RoleName } from '../../../domain/value-object/Role';

@Injectable()
export class DeleteMessageService implements DeleteMessageUseCase {
  constructor(
    @Inject(FIND_MESSAGE_PORT) private readonly findMessage: FindMessagePort,
    @Inject(SAVE_MESSAGE_PORT) private readonly saveMessage: SaveMessagePort,
  ) {}

  async execute(command: DeleteMessageCommand): Promise<void> {
    const message = await this.findMessage.findById(command.messageId);
    if (!message) throw new MessageNotFoundException();

    if (
      command.actorRole !== RoleName.ADMIN &&
      message.userId !== command.actorId
    ) {
      throw new ForbiddenException('僅留言本人或 ADMIN 可刪除留言');
    }

    await this.saveMessage.softDelete(command.messageId);
  }
}
