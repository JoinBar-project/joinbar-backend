import { Injectable } from '@nestjs/common';
import { IpBlockPort } from '../../../application/port/out/security/IpBlockPort';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { buildFailedIpKey } from '../../../infrastructure/redis/cache-keys';

/**
 * IP 登入失敗計數 Adapter（Redis）。
 * Redis 不可用時 graceful degradation，回傳 0（不計數）。
 */
@Injectable()
export class RedisIpBlockAdapter implements IpBlockPort {
  private readonly COUNTER_TTL = 3600;

  constructor(private readonly redis: RedisService) {}

  async recordFailedIpAttempt(ip: string): Promise<number> {
    if (!this.redis.isAvailable) return 0;
    return this.redis.increment(buildFailedIpKey(this.redis.keyPrefix, ip), this.COUNTER_TTL);
  }

  async resetIpAttempts(ip: string): Promise<void> {
    await this.redis.del(buildFailedIpKey(this.redis.keyPrefix, ip));
  }
}
