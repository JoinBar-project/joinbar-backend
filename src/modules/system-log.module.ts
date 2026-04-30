import { Module } from '@nestjs/common';
import { PrismaSystemLogRepository } from '../adapter/out/persistence/PrismaSystemLogRepository';
import { SAVE_SYSTEM_LOG_PORT } from '../application/port/out/shared/SaveSystemLogPort';

@Module({
  providers: [
    PrismaSystemLogRepository,
    { provide: SAVE_SYSTEM_LOG_PORT, useExisting: PrismaSystemLogRepository },
  ],
  exports: [SAVE_SYSTEM_LOG_PORT],
})
export class SystemLogModule {}
