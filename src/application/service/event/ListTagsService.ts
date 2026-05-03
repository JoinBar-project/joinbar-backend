import { Inject, Injectable } from '@nestjs/common';
import {
  ListTagsResult,
  ListTagsUseCase,
} from '../../port/in/event/ListTagsUseCase';
import { FIND_TAG_PORT, FindTagPort } from '../../port/out/event/FindTagPort';

@Injectable()
export class ListTagsService implements ListTagsUseCase {
  constructor(@Inject(FIND_TAG_PORT) private readonly findTag: FindTagPort) {}

  async execute(): Promise<ListTagsResult> {
    const tags = await this.findTag.findAll();
    return { tags };
  }
}
