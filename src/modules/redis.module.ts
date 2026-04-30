import { Global, Module } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis/redis.service';

/**
 * @Global() — RedisService 全域共用。
 * Redis-backed Port（TokenBlacklist、UserContextCache 等）於各 domain module 實作時逐步加入。
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
