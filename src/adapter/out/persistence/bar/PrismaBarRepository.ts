import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  FindBarPort,
  BarData,
  FindManyBarsOptions,
} from '../../../../application/port/out/bar/FindBarPort';
import {
  SaveBarPort,
  CreateBarData,
  UpdateBarData,
} from '../../../../application/port/out/bar/SaveBarPort';

/** BarTag の全カラム名 / BarTag 的全欄位名稱 */
const BAR_TAG_KEYS = [
  'sport',
  'music',
  'student',
  'bistro',
  'drink',
  'joy',
  'romantic',
  'oldschool',
  'highlevel',
  'easy',
] as const;

type BarTagKey = (typeof BAR_TAG_KEYS)[number];

@Injectable()
export class PrismaBarRepository implements FindBarPort, SaveBarPort {
  constructor(private readonly prisma: PrismaService) {}

  // ─── FindBarPort ─────────────────────────────────────────────────────

  async findById(barId: string): Promise<BarData | null> {
    const record = await this.prisma.bar.findUnique({
      where: { id: barId, deletedAt: null },
      include: { barTag: true },
    });
    return record ? this.toBarData(record) : null;
  }

  async findMany(options: FindManyBarsOptions): Promise<BarData[]> {
    const where = this.buildWhere(options);
    const records = await this.prisma.bar.findMany({
      where,
      include: { barTag: true },
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toBarData(r));
  }

  async count(
    options: Pick<FindManyBarsOptions, 'keyword' | 'tags'>,
  ): Promise<number> {
    return this.prisma.bar.count({ where: this.buildWhere(options) });
  }

  // ─── SaveBarPort ─────────────────────────────────────────────────────

  async create(data: CreateBarData): Promise<string> {
    const record = await this.prisma.bar.create({
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        website: data.website,
        imageUrl: data.imageUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        googlePlaceId: data.googlePlaceId,
        ...(data.tags && {
          barTag: { create: this.toTagRecord(data.tags) },
        }),
      },
    });
    return record.id;
  }

  async update(barId: string, data: UpdateBarData): Promise<void> {
    await this.prisma.bar.update({
      where: { id: barId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.googlePlaceId !== undefined && {
          googlePlaceId: data.googlePlaceId,
        }),
        ...(data.tags && {
          barTag: {
            upsert: {
              create: this.toTagRecord(data.tags),
              update: this.toTagRecord(data.tags),
            },
          },
        }),
      },
    });
  }

  async softDelete(barId: string): Promise<void> {
    await this.prisma.bar.update({
      where: { id: barId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── private helpers ──────────────────────────────────────────────────

  private buildWhere(
    options: Pick<FindManyBarsOptions, 'keyword' | 'tags'>,
  ): Prisma.BarWhereInput {
    const conditions: Prisma.BarWhereInput[] = [{ deletedAt: null }];

    if (options.keyword) {
      conditions.push({
        OR: [
          { name: { contains: options.keyword, mode: 'insensitive' } },
          { address: { contains: options.keyword, mode: 'insensitive' } },
        ],
      });
    }

    if (options.tags && options.tags.length > 0) {
      conditions.push({
        barTag: {
          OR: options.tags.map((tag) => ({ [tag as BarTagKey]: true })),
        },
      });
    }

    return { AND: conditions };
  }

  private toTagRecord(
    tags: Partial<Record<BarTagKey, boolean>>,
  ): Record<BarTagKey, boolean> {
    const result = {} as Record<BarTagKey, boolean>;
    for (const key of BAR_TAG_KEYS) {
      result[key] = tags[key] ?? false;
    }
    return result;
  }

  private toBarData(
    record: Awaited<ReturnType<typeof this.prisma.bar.findUnique>> & {
      barTag: Record<BarTagKey, boolean> | null;
    },
  ): BarData {
    return {
      id: record!.id,
      name: record!.name,
      address: record!.address,
      phone: record!.phone,
      website: record!.website,
      imageUrl: record!.imageUrl,
      latitude: record!.latitude !== null ? Number(record!.latitude) : null,
      longitude: record!.longitude !== null ? Number(record!.longitude) : null,
      googlePlaceId: record!.googlePlaceId,
      barTag: record!.barTag,
      createdAt: record!.createdAt,
      updatedAt: record!.updatedAt,
    };
  }
}
