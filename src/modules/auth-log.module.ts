import { Global, Module } from '@nestjs/common';
import { PrismaAuthLogRepository } from '../adapter/out/persistence/auth/PrismaAuthLogRepository';
import { SAVE_AUTH_LOG_PORT } from '../application/port/out/auth/SaveAuthLogPort';

/** @Global() — 登入日誌 Port 全域可用，LoginService / LogoutService 等皆可注入 */
@Global()
@Module({
  providers: [
    PrismaAuthLogRepository,
    { provide: SAVE_AUTH_LOG_PORT, useExisting: PrismaAuthLogRepository },
  ],
  exports: [SAVE_AUTH_LOG_PORT],
})
export class AuthLogModule {}
