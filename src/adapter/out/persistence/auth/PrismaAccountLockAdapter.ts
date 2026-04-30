import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AccountLockPort } from '../../../../application/port/out/auth/AccountLockPort';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { buildFailedLoginKey } from '../../../../infrastructure/redis/cache-keys';

/**
 * 帳號鎖定 Adapter：
 * - Redis：即時失敗計數（INCR + TTL 30 分鐘）
 * - DB：持久化鎖定狀態（lockedAt），Redis 重啟後仍有效
 *
 * Redis 不可用時 graceful degradation（不計數，但 DB 鎖定仍有效）。
 */
@Injectable()
export class PrismaAccountLockAdapter implements AccountLockPort {
  private readonly COUNTER_TTL = 1800; // 30 分鐘

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async recordFailedLogin(email: string): Promise<number> {
    if (!this.redis.isAvailable) return 0;
    const key = buildFailedLoginKey(this.redis.keyPrefix, email);
    const count = await this.redis.increment(key, this.COUNTER_TTL);

    // 同步 DB（失敗不阻塞）
    await this.prisma.userRecord
      .updateMany({ where: { email }, data: { failedLoginCount: count } })
      .catch(() => {});

    return count;
  }

  async resetFailedLogin(email: string): Promise<void> {
    await this.redis.del(buildFailedLoginKey(this.redis.keyPrefix, email));

    await this.prisma.userRecord
      .updateMany({ where: { email }, data: { failedLoginCount: 0, lockedAt: null } })
      .catch(() => {});
  }

  async isLocked(email: string): Promise<boolean> {
    const record = await this.prisma.userRecord.findUnique({
      where: { email },
      select: { lockedAt: true },
    });
    return record?.lockedAt != null;
  }

  async lockAccount(email: string): Promise<void> {
    await this.prisma.userRecord.updateMany({
      where: { email },
      data: { lockedAt: new Date() },
    });
  }

  async unlockAccount(email: string): Promise<void> {
    await this.redis.del(buildFailedLoginKey(this.redis.keyPrefix, email));
    await this.prisma.userRecord.updateMany({
      where: { email },
      data: { failedLoginCount: 0, lockedAt: null },
    });
  }
}
