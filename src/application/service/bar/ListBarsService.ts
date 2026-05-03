import { Inject, Injectable } from '@nestjs/common';
import {
  ListBarsCommand,
  ListBarsResult,
  ListBarsUseCase,
} from '../../port/in/bar/ListBarsUseCase';
import { FIND_BAR_PORT, FindBarPort } from '../../port/out/bar/FindBarPort';
import {
  getPagination,
  buildPaginationMeta,
} from '../../../infrastructure/pagination';
import { toTagNames } from './bar-tag.helper';

@Injectable()
export class ListBarsService implements ListBarsUseCase {
  constructor(@Inject(FIND_BAR_PORT) private readonly findBar: FindBarPort) {}

  async execute(command: ListBarsCommand): Promise<ListBarsResult> {
    const { page, limit, offset } = getPagination({
      page: command.page,
      limit: command.limit,
    });

    const [items, total] = await Promise.all([
      this.findBar.findMany({
        keyword: command.keyword,
        tags: command.tags,
        skip: offset,
        take: limit,
      }),
      this.findBar.count({
        keyword: command.keyword,
        tags: command.tags,
      }),
    ]);

    return {
      items: items.map((bar) => ({
        id: bar.id,
        name: bar.name,
        address: bar.address,
        phone: bar.phone,
        website: bar.website,
        imageUrl: bar.imageUrl,
        latitude: bar.latitude,
        longitude: bar.longitude,
        tags: toTagNames(bar.barTag),
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
