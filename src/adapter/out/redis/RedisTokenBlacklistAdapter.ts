import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { TokenBlacklistPort } from '../../../application/port/out/auth/TokenBlacklistPort';
import { ClearUserContextPort } from '../../../application/port/out/user/ClearUserContextPort';
import { buildUserContextKey } from '../../../infrastructure/redis/cache-keys';
import { getEnv } from '../../../infrastructure/validate-env';

/**
 * 同時實作 TokenBlacklistPort 和 ClearUserContextPort。
 * 兩者都委派給 RedisService，但在應用層保持職責分離。
 */
@Injectable()
export class RedisTokenBlacklistAdapter
  implements TokenBlacklistPort, ClearUserContextPort, OnModuleInit
{
  private keyPrefix = '';

  constructor(private readonly redis: RedisService) {}

  onModuleInit(): void {
    this.keyPrefix = getEnv().REDIS_KEY_PREFIX;
  }

  addToBlacklist(token: string, ttlSeconds: number): Promise<void> {
    return this.redis.addToBlacklist(token, ttlSeconds);
  }

  isBlacklisted(token: string): Promise<boolean> {
    return this.redis.isTokenBlacklisted(token);
  }

  async clearUserContext(userId: string): Promise<void> {
    await this.redis.del(buildUserContextKey(this.keyPrefix, userId));
  }
}
