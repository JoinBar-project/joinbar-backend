import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { ClearUserContextPort } from '../../../application/port/out/user/ClearUserContextPort';
import { buildUserContextKey } from '../../../infrastructure/redis/cache-keys';
import { getEnv } from '../../../infrastructure/validate-env';

/**
 * 登出 / 帳號狀態變更時清除 UserContext 快取。
 * 與 RedisUserContextCacheAdapter 共用 key 格式（buildUserContextKey）。
 */
@Injectable()
export class RedisUserContextClearAdapter
  implements ClearUserContextPort, OnModuleInit
{
  private keyPrefix = '';

  constructor(private readonly redis: RedisService) {}

  onModuleInit(): void {
    this.keyPrefix = getEnv().REDIS_KEY_PREFIX;
  }

  async clearUserContext(userId: string): Promise<void> {
    await this.redis.del(buildUserContextKey(this.keyPrefix, userId));
  }
}
