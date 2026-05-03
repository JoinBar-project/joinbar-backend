import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { FindParticipationPort } from '../../../../application/port/out/event/FindParticipationPort';
import { SaveParticipationPort } from '../../../../application/port/out/event/SaveParticipationPort';
import { EventFullException } from '../../../../domain/exception/EventFullException';

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

  async createWithCapacityCheck(
    userId: string,
    eventId: string,
    maxPeople: number,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const count = await tx.eventParticipation.count({
            where: { eventId },
          });
          if (count >= maxPeople) throw new EventFullException();
          await tx.eventParticipation.create({ data: { userId, eventId } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (err instanceof EventFullException) throw err;
      // Prisma 序列化衝突（P2034）表示有並發報名搶先完成，視同已滿
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2034'
      ) {
        throw new EventFullException();
      }
      throw err;
    }
  }

  async delete(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventParticipation.delete({
      where: { userId_eventId: { userId, eventId } },
    });
  }
}
