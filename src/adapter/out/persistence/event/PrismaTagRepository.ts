import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  FindTagPort,
  TagData,
} from '../../../../application/port/out/event/FindTagPort';

@Injectable()
export class PrismaTagRepository implements FindTagPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TagData[]> {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async findByNames(names: string[]): Promise<TagData[]> {
    return this.prisma.tag.findMany({
      where: { name: { in: names } },
    });
  }
}
