import { Inject, Injectable } from '@nestjs/common';
import {
  LIST_BARS_USE_CASE,
  ListBarsCommand,
  ListBarsResult,
  ListBarsUseCase,
} from '../port/in/bar/ListBarsUseCase';
import {
  GET_BAR_USE_CASE,
  GetBarCommand,
  GetBarResult,
  GetBarUseCase,
} from '../port/in/bar/GetBarUseCase';
import {
  CREATE_BAR_USE_CASE,
  CreateBarCommand,
  CreateBarResult,
  CreateBarUseCase,
} from '../port/in/bar/CreateBarUseCase';
import {
  UPDATE_BAR_USE_CASE,
  UpdateBarCommand,
  UpdateBarResult,
  UpdateBarUseCase,
} from '../port/in/bar/UpdateBarUseCase';
import {
  DELETE_BAR_USE_CASE,
  DeleteBarCommand,
  DeleteBarUseCase,
} from '../port/in/bar/DeleteBarUseCase';
import {
  AI_DESCRIBE_BAR_USE_CASE,
  AiDescribeBarCommand,
  AiDescribeBarResult,
  AiDescribeBarUseCase,
} from '../port/in/bar/AiDescribeBarUseCase';

/**
 * Bar 領域の公開 API。
 * Controller はこの Facade 経由で全 use case を呼び出す。
 * Bar 領域的公開 API，Controller 透過此 Facade 呼叫所有 use case。
 */
@Injectable()
export class BarFacade {
  constructor(
    @Inject(LIST_BARS_USE_CASE)
    private readonly listBarsUseCase: ListBarsUseCase,
    @Inject(GET_BAR_USE_CASE)
    private readonly getBarUseCase: GetBarUseCase,
    @Inject(CREATE_BAR_USE_CASE)
    private readonly createBarUseCase: CreateBarUseCase,
    @Inject(UPDATE_BAR_USE_CASE)
    private readonly updateBarUseCase: UpdateBarUseCase,
    @Inject(DELETE_BAR_USE_CASE)
    private readonly deleteBarUseCase: DeleteBarUseCase,
    @Inject(AI_DESCRIBE_BAR_USE_CASE)
    private readonly aiDescribeBarUseCase: AiDescribeBarUseCase,
  ) {}

  listBars(command: ListBarsCommand): Promise<ListBarsResult> {
    return this.listBarsUseCase.execute(command);
  }

  getBar(command: GetBarCommand): Promise<GetBarResult> {
    return this.getBarUseCase.execute(command);
  }

  createBar(command: CreateBarCommand): Promise<CreateBarResult> {
    return this.createBarUseCase.execute(command);
  }

  updateBar(command: UpdateBarCommand): Promise<UpdateBarResult> {
    return this.updateBarUseCase.execute(command);
  }

  deleteBar(command: DeleteBarCommand): Promise<void> {
    return this.deleteBarUseCase.execute(command);
  }

  aiDescribeBar(command: AiDescribeBarCommand): Promise<AiDescribeBarResult> {
    return this.aiDescribeBarUseCase.execute(command);
  }
}
