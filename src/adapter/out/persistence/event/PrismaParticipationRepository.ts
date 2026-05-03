import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { FindParticipationPort } from '../../../../application/port/out/event/FindParticipationPort';
import { SaveParticipationPort } from '../../../../application/port/out/event/SaveParticipationPort';

@Injectable()
export class PrismaParticipationRepository
  implements FindParticipationPort, SaveParticipationPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.eventParticipation.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { id: true },
    });
  }

  async create(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventParticipation.create({
      data: { userId, eventId },
    });
  }

  async delete(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventParticipation.delete({
      where: { userId_eventId: { userId, eventId } },
    });
  }
}
