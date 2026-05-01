import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { UserContextCachePort } from '../../../application/port/out/user/UserContextCachePort';
import { buildUserContextKey } from '../../../infrastructure/redis/cache-keys';
import { getEnv } from '../../../infrastructure/validate-env';

/**
 * UserContextCachePort を RedisService に委譲する Outbound Adapter。
 * Key の組み立ては此処で一元管理し、ClearUserContextPort と同形式を保証する。
 */
@Injectable()
export class RedisUserContextCacheAdapter
  implements UserContextCachePort, OnModuleInit
{
  private keyPrefix = '';

  constructor(private readonly redis: RedisService) {}

  onModuleInit(): void {
    this.keyPrefix = getEnv().REDIS_KEY_PREFIX;
  }

  get isAvailable(): boolean {
    return this.redis.isAvailable;
  }

  async getByUserId(userId: string): Promise<string | null> {
    return this.redis.get(buildUserContextKey(this.keyPrefix, userId));
  }

  async setByUserId(
    userId: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      buildUserContextKey(this.keyPrefix, userId),
      value,
      ttlSeconds,
    );
  }
}
