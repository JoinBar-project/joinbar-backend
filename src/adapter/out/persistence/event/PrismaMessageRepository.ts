import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  FindMessagePort,
  MessageData,
} from '../../../../application/port/out/event/FindMessagePort';
import { SaveMessagePort } from '../../../../application/port/out/event/SaveMessagePort';

@Injectable()
export class PrismaMessageRepository
  implements FindMessagePort, SaveMessagePort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByEventId(eventId: string): Promise<MessageData[]> {
    const records = await this.prisma.message.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => ({
      id: r.id,
      content: r.content,
      userId: r.userId,
      eventId: r.eventId,
      createdAt: r.createdAt,
    }));
  }

  async findById(messageId: string): Promise<MessageData | null> {
    const record = await this.prisma.message.findUnique({
      where: { id: messageId, deletedAt: null },
    });
    if (!record) return null;
    return {
      id: record.id,
      content: record.content,
      userId: record.userId,
      eventId: record.eventId,
      createdAt: record.createdAt,
    };
  }

  async create(
    userId: string,
    eventId: string,
    content: string,
  ): Promise<MessageData> {
    const record = await this.prisma.message.create({
      data: { userId, eventId, content },
    });
    return {
      id: record.id,
      content: record.content,
      userId: record.userId,
      eventId: record.eventId,
      createdAt: record.createdAt,
    };
  }

  async softDelete(messageId: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }
}
