import { Injectable, OnModuleInit } from '@nestjs/common';
import { SessionActivityPort } from '../../../application/port/out/auth/SessionActivityPort';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { buildSessionActivityKey } from '../../../infrastructure/redis/cache-keys';

/**
 * Session 活動追蹤 Adapter（Redis）。
 * key 存在代表 session 活躍，key 過期代表閒置逾時。
 * Redis 不可用時 graceful degradation（視為活躍，不鎖定使用者）。
 */
@Injectable()
export class RedisSessionActivityAdapter
  implements SessionActivityPort, OnModuleInit
{
  private keyPrefix = '';

  constructor(private readonly redis: RedisService) {}

  onModuleInit(): void {
    this.keyPrefix = this.redis.keyPrefix;
  }

  async touchActivity(userId: string, ttlMinutes: number): Promise<void> {
    const key = buildSessionActivityKey(this.keyPrefix, userId);
    await this.redis.set(key, '1', ttlMinutes * 60);
  }

  async isActive(userId: string): Promise<boolean> {
    if (!this.redis.isAvailable) return true;
    const key = buildSessionActivityKey(this.keyPrefix, userId);
    return (await this.redis.get(key)) !== null;
  }
}
