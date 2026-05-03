import { Inject, Injectable } from '@nestjs/common';
import {
  UpdateBarCommand,
  UpdateBarResult,
  UpdateBarUseCase,
} from '../../port/in/bar/UpdateBarUseCase';
import { FIND_BAR_PORT, FindBarPort } from '../../port/out/bar/FindBarPort';
import { SAVE_BAR_PORT, SaveBarPort } from '../../port/out/bar/SaveBarPort';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { toTagNames } from './bar-tag.helper';

@Injectable()
export class UpdateBarService implements UpdateBarUseCase {
  constructor(
    @Inject(FIND_BAR_PORT) private readonly findBar: FindBarPort,
    @Inject(SAVE_BAR_PORT) private readonly saveBar: SaveBarPort,
  ) {}

  async execute(command: UpdateBarCommand): Promise<UpdateBarResult> {
    const existing = await this.findBar.findById(command.barId);
    if (!existing) throw new BarNotFoundException();

    const { barId, ...data } = command;
    await this.saveBar.update(barId, data);

    const updated = await this.findBar.findById(barId);
    if (!updated) throw new BarNotFoundException();

    return {
      id: updated.id,
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      website: updated.website,
      imageUrl: updated.imageUrl,
      latitude: updated.latitude,
      longitude: updated.longitude,
      googlePlaceId: updated.googlePlaceId,
      tags: toTagNames(updated.barTag),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
