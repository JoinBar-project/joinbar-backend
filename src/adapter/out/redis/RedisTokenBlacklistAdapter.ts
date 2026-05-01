import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { TokenBlacklistPort } from '../../../application/port/out/auth/TokenBlacklistPort';

/**
 * Token 黑名單 Adapter — 委派給 RedisService。
 * Redis 不可用時 isBlacklisted 採 fail-closed（拋 503）。
 */
@Injectable()
export class RedisTokenBlacklistAdapter implements TokenBlacklistPort {
  constructor(private readonly redis: RedisService) {}

  addToBlacklist(token: string, ttlSeconds: number): Promise<void> {
    return this.redis.addToBlacklist(token, ttlSeconds);
  }

  isBlacklisted(token: string): Promise<boolean> {
    return this.redis.isTokenBlacklisted(token);
  }
}
