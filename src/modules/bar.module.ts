import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { JwtModule } from './jwt.module';
import { BarController } from '../adapter/in/web/bar/BarController';
import { BarFacade } from '../application/facade/BarFacade';
import { ListBarsService } from '../application/service/bar/ListBarsService';
import { GetBarService } from '../application/service/bar/GetBarService';
import { CreateBarService } from '../application/service/bar/CreateBarService';
import { UpdateBarService } from '../application/service/bar/UpdateBarService';
import { DeleteBarService } from '../application/service/bar/DeleteBarService';
import { AiDescribeBarService } from '../application/service/bar/AiDescribeBarService';
import { PrismaBarRepository } from '../adapter/out/persistence/bar/PrismaBarRepository';
import { GeminiAdapter } from '../adapter/out/gemini/GeminiAdapter';
import { LIST_BARS_USE_CASE } from '../application/port/in/bar/ListBarsUseCase';
import { GET_BAR_USE_CASE } from '../application/port/in/bar/GetBarUseCase';
import { CREATE_BAR_USE_CASE } from '../application/port/in/bar/CreateBarUseCase';
import { UPDATE_BAR_USE_CASE } from '../application/port/in/bar/UpdateBarUseCase';
import { DELETE_BAR_USE_CASE } from '../application/port/in/bar/DeleteBarUseCase';
import { AI_DESCRIBE_BAR_USE_CASE } from '../application/port/in/bar/AiDescribeBarUseCase';
import { FIND_BAR_PORT } from '../application/port/out/bar/FindBarPort';
import { SAVE_BAR_PORT } from '../application/port/out/bar/SaveBarPort';
import { GEMINI_PORT } from '../application/port/out/shared/GeminiPort';

@Module({
  imports: [AuthModule, JwtModule],
  controllers: [BarController],
  providers: [
    // ─── Persistence Adapter ─────────────────────────────────────────
    PrismaBarRepository,
    { provide: FIND_BAR_PORT, useExisting: PrismaBarRepository },
    { provide: SAVE_BAR_PORT, useExisting: PrismaBarRepository },
    // ─── External Service Adapter ────────────────────────────────────
    GeminiAdapter,
    { provide: GEMINI_PORT, useExisting: GeminiAdapter },
    // ─── Application Services ────────────────────────────────────────
    ListBarsService,
    { provide: LIST_BARS_USE_CASE, useExisting: ListBarsService },
    GetBarService,
    { provide: GET_BAR_USE_CASE, useExisting: GetBarService },
    CreateBarService,
    { provide: CREATE_BAR_USE_CASE, useExisting: CreateBarService },
    UpdateBarService,
    { provide: UPDATE_BAR_USE_CASE, useExisting: UpdateBarService },
    DeleteBarService,
    { provide: DELETE_BAR_USE_CASE, useExisting: DeleteBarService },
    AiDescribeBarService,
    { provide: AI_DESCRIBE_BAR_USE_CASE, useExisting: AiDescribeBarService },
    // ─── Facade ──────────────────────────────────────────────────────
    BarFacade,
  ],
})
export class BarModule {}
