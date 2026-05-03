import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteBarCommand,
  DeleteBarUseCase,
} from '../../port/in/bar/DeleteBarUseCase';
import { FIND_BAR_PORT, FindBarPort } from '../../port/out/bar/FindBarPort';
import { SAVE_BAR_PORT, SaveBarPort } from '../../port/out/bar/SaveBarPort';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';

@Injectable()
export class DeleteBarService implements DeleteBarUseCase {
  constructor(
    @Inject(FIND_BAR_PORT) private readonly findBar: FindBarPort,
    @Inject(SAVE_BAR_PORT) private readonly saveBar: SaveBarPort,
  ) {}

  async execute(command: DeleteBarCommand): Promise<void> {
    const bar = await this.findBar.findById(command.barId);
    if (!bar) throw new BarNotFoundException();
    await this.saveBar.softDelete(command.barId);
  }
}
