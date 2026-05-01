import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from './redis.service';

/**
 * Redis-backed ThrottlerStorage — 支援水平擴展。
 * 以 Lua Script 保證原子性，透過 Sorted Set 實作滑動視窗。
 * Redis 不可用時靜默降級（不節流）。
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `throttler:${key}:${throttlerName}`;
    const totalHits = await this.redis.throttleIncrement(storageKey, ttl);
    const timeToExpire = totalHits > 0 ? Math.ceil(ttl / 1000) : 0;
    const isBlocked = totalHits > limit;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire: isBlocked ? timeToExpire : 0,
    };
  }
}
