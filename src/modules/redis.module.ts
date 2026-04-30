import { Global, Module } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis/redis.service';
import { RedisTokenBlacklistAdapter } from '../adapter/out/redis/RedisTokenBlacklistAdapter';
import { RedisUserContextCacheAdapter } from '../adapter/out/redis/RedisUserContextCacheAdapter';
import { RedisSessionActivityAdapter } from '../adapter/out/redis/RedisSessionActivityAdapter';
import { RedisIpBlockAdapter } from '../adapter/out/redis/RedisIpBlockAdapter';
import { TOKEN_BLACKLIST_PORT } from '../application/port/out/auth/TokenBlacklistPort';
import { CLEAR_USER_CONTEXT_PORT } from '../application/port/out/user/ClearUserContextPort';
import { USER_CONTEXT_CACHE_PORT } from '../application/port/out/user/UserContextCachePort';
import { SESSION_ACTIVITY_PORT } from '../application/port/out/auth/SessionActivityPort';
import { IP_BLOCK_PORT } from '../application/port/out/security/IpBlockPort';

/**
 * @Global() — 所有 Redis-backed Port 在此統一提供，無需在各 Module 重複宣告。
 */
@Global()
@Module({
  providers: [
    RedisService,
    RedisTokenBlacklistAdapter,
    { provide: TOKEN_BLACKLIST_PORT, useExisting: RedisTokenBlacklistAdapter },
    { provide: CLEAR_USER_CONTEXT_PORT, useExisting: RedisTokenBlacklistAdapter },
    RedisUserContextCacheAdapter,
    { provide: USER_CONTEXT_CACHE_PORT, useExisting: RedisUserContextCacheAdapter },
    RedisSessionActivityAdapter,
    { provide: SESSION_ACTIVITY_PORT, useExisting: RedisSessionActivityAdapter },
    RedisIpBlockAdapter,
    { provide: IP_BLOCK_PORT, useExisting: RedisIpBlockAdapter },
  ],
  exports: [
    RedisService,
    TOKEN_BLACKLIST_PORT,
    CLEAR_USER_CONTEXT_PORT,
    USER_CONTEXT_CACHE_PORT,
    SESSION_ACTIVITY_PORT,
    IP_BLOCK_PORT,
  ],
})
export class RedisModule {}
