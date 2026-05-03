import { Inject, Injectable } from '@nestjs/common';
import {
  GetBarCommand,
  GetBarResult,
  GetBarUseCase,
} from '../../port/in/bar/GetBarUseCase';
import { FIND_BAR_PORT, FindBarPort } from '../../port/out/bar/FindBarPort';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { toTagNames } from './bar-tag.helper';

@Injectable()
export class GetBarService implements GetBarUseCase {
  constructor(@Inject(FIND_BAR_PORT) private readonly findBar: FindBarPort) {}

  async execute(command: GetBarCommand): Promise<GetBarResult> {
    const bar = await this.findBar.findById(command.barId);
    if (!bar) throw new BarNotFoundException();

    return {
      id: bar.id,
      name: bar.name,
      address: bar.address,
      phone: bar.phone,
      website: bar.website,
      imageUrl: bar.imageUrl,
      latitude: bar.latitude,
      longitude: bar.longitude,
      googlePlaceId: bar.googlePlaceId,
      tags: toTagNames(bar.barTag),
      createdAt: bar.createdAt,
      updatedAt: bar.updatedAt,
    };
  }
}
