import { Inject, Injectable } from '@nestjs/common';
import {
  ListEventsCommand,
  ListEventsResult,
  ListEventsUseCase,
} from '../../port/in/event/ListEventsUseCase';
import {
  FIND_EVENT_PORT,
  FindEventPort,
} from '../../port/out/event/FindEventPort';
import {
  getPagination,
  buildPaginationMeta,
} from '../../../infrastructure/pagination';

@Injectable()
export class ListEventsService implements ListEventsUseCase {
  constructor(
    @Inject(FIND_EVENT_PORT) private readonly findEvent: FindEventPort,
  ) {}

  async execute(command: ListEventsCommand): Promise<ListEventsResult> {
    const { page, limit, offset } = getPagination({
      page: command.page,
      limit: command.limit,
    });

    const filter = {
      keyword: command.keyword,
      tags: command.tags,
      startFrom: command.startFrom,
      startTo: command.startTo,
      barId: command.barId,
    };

    const [items, total] = await Promise.all([
      this.findEvent.findMany({ ...filter, skip: offset, take: limit }),
      this.findEvent.count(filter),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        name: e.name,
        barId: e.barId,
        barName: e.barName,
        location: e.location,
        startAt: e.startAt,
        endAt: e.endAt,
        maxPeople: e.maxPeople,
        imageUrl: e.imageUrl,
        price: e.price,
        tags: e.tags,
        participantCount: e.participantCount,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
