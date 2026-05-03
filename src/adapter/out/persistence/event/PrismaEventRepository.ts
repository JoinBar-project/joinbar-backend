import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  EventData,
  FindEventPort,
  FindManyEventsOptions,
} from '../../../../application/port/out/event/FindEventPort';
import {
  CreateEventData,
  SaveEventPort,
  UpdateEventData,
} from '../../../../application/port/out/event/SaveEventPort';

@Injectable()
export class PrismaEventRepository implements FindEventPort, SaveEventPort {
  constructor(private readonly prisma: PrismaService) {}

  // ─── FindEventPort ────────────────────────────────────────────────────

  async findById(eventId: string): Promise<EventData | null> {
    const record = await this.prisma.eventRecord.findUnique({
      where: { id: eventId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { participants: true } },
      },
    });
    return record ? this.toEventData(record) : null;
  }

  async findMany(options: FindManyEventsOptions): Promise<EventData[]> {
    const records = await this.prisma.eventRecord.findMany({
      where: this.buildWhere(options),
      include: {
        tags: { include: { tag: true } },
        _count: { select: { participants: true } },
      },
      skip: options.skip,
      take: options.take,
      orderBy: { startAt: 'asc' },
    });
    return records.map((r) => this.toEventData(r));
  }

  async count(
    options: Omit<FindManyEventsOptions, 'skip' | 'take'>,
  ): Promise<number> {
    return this.prisma.eventRecord.count({ where: this.buildWhere(options) });
  }

  async countParticipants(eventId: string): Promise<number> {
    return this.prisma.eventParticipation.count({
      where: { eventId },
    });
  }

  // ─── SaveEventPort ────────────────────────────────────────────────────

  async create(data: CreateEventData): Promise<EventData> {
    const record = await this.prisma.eventRecord.create({
      data: {
        name: data.name,
        description: data.description,
        barId: data.barId,
        barName: data.barName,
        location: data.location,
        startAt: data.startAt,
        endAt: data.endAt,
        maxPeople: data.maxPeople,
        imageUrl: data.imageUrl,
        price: data.price,
        hostUser: data.hostUser,
        ...(data.tagIds &&
          data.tagIds.length > 0 && {
            tags: {
              create: data.tagIds.map((tagId) => ({ tagId })),
            },
          }),
      },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { participants: true } },
      },
    });
    return this.toEventData(record);
  }

  async update(eventId: string, data: UpdateEventData): Promise<EventData> {
    const record = await this.prisma.eventRecord.update({
      where: { id: eventId },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { participants: true } },
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.barId !== undefined && { barId: data.barId }),
        ...(data.barName !== undefined && { barName: data.barName }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.startAt !== undefined && { startAt: data.startAt }),
        ...(data.endAt !== undefined && { endAt: data.endAt }),
        ...(data.maxPeople !== undefined && { maxPeople: data.maxPeople }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: data.tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
    });
    return this.toEventData(record);
  }

  async softDelete(eventId: string): Promise<void> {
    await this.prisma.eventRecord.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── private helpers ──────────────────────────────────────────────────

  private buildWhere(
    options: Omit<FindManyEventsOptions, 'skip' | 'take'>,
  ): Prisma.EventRecordWhereInput {
    const conditions: Prisma.EventRecordWhereInput[] = [{ deletedAt: null }];

    if (options.keyword) {
      conditions.push({
        OR: [
          { name: { contains: options.keyword, mode: 'insensitive' } },
          { location: { contains: options.keyword, mode: 'insensitive' } },
        ],
      });
    }

    if (options.tags && options.tags.length > 0) {
      conditions.push({
        tags: {
          some: {
            tag: { name: { in: options.tags } },
          },
        },
      });
    }

    if (options.startFrom) {
      conditions.push({ startAt: { gte: options.startFrom } });
    }

    if (options.startTo) {
      conditions.push({ startAt: { lte: options.startTo } });
    }

    if (options.barId) {
      conditions.push({ barId: options.barId });
    }

    return { AND: conditions };
  }

  private toEventData(
    record: Prisma.EventRecordGetPayload<{
      include: {
        tags: { include: { tag: true } };
        _count: { select: { participants: true } };
      };
    }>,
  ): EventData {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      barId: record.barId,
      barName: record.barName,
      location: record.location,
      startAt: record.startAt,
      endAt: record.endAt,
      maxPeople: record.maxPeople,
      imageUrl: record.imageUrl,
      price: record.price,
      hostUser: record.hostUser,
      tags: record.tags.map((t) => t.tag.name),
      participantCount: record._count.participants,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
