import { Inject, Injectable } from '@nestjs/common';
import {
  CreateBarCommand,
  CreateBarResult,
  CreateBarUseCase,
} from '../../port/in/bar/CreateBarUseCase';
import { FIND_BAR_PORT, FindBarPort } from '../../port/out/bar/FindBarPort';
import { SAVE_BAR_PORT, SaveBarPort } from '../../port/out/bar/SaveBarPort';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { toTagNames } from './bar-tag.helper';

@Injectable()
export class CreateBarService implements CreateBarUseCase {
  constructor(
    @Inject(FIND_BAR_PORT) private readonly findBar: FindBarPort,
    @Inject(SAVE_BAR_PORT) private readonly saveBar: SaveBarPort,
  ) {}

  async execute(command: CreateBarCommand): Promise<CreateBarResult> {
    const newId = await this.saveBar.create(command);
    const bar = await this.findBar.findById(newId);
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
