import { Global, Module } from '@nestjs/common';
import { PrismaAccountLockAdapter } from '../adapter/out/persistence/auth/PrismaAccountLockAdapter';
import { PrismaIpListRepository } from '../adapter/out/persistence/security/PrismaIpListRepository';
import { ACCOUNT_LOCK_PORT } from '../application/port/out/auth/AccountLockPort';
import { IP_LIST_PORT } from '../application/port/out/security/IpListPort';

/**
 * @Global() — 安全相關 Port 全域可用（帳號鎖定、IP 黑白名單）。
 */
@Global()
@Module({
  providers: [
    PrismaAccountLockAdapter,
    { provide: ACCOUNT_LOCK_PORT, useExisting: PrismaAccountLockAdapter },
    PrismaIpListRepository,
    { provide: IP_LIST_PORT, useExisting: PrismaIpListRepository },
  ],
  exports: [ACCOUNT_LOCK_PORT, IP_LIST_PORT],
})
export class SecurityModule {}
