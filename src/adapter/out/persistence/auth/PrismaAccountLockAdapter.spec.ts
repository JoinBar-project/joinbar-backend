import { PrismaAccountLockAdapter } from './PrismaAccountLockAdapter';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

interface FakeRedis {
  isAvailable: boolean;
  keyPrefix: string;
  increment: jest.Mock;
  del: jest.Mock;
}

const makeRedis = (overrides: Partial<FakeRedis> = {}): FakeRedis => ({
  isAvailable: true,
  keyPrefix: 'joinbar:',
  increment: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makePrisma = (
  userRecordOverrides: Partial<{
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  }> = {},
): PrismaService =>
  ({
    userRecord: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({ lockedAt: null }),
      ...userRecordOverrides,
    },
  }) as unknown as PrismaService;

describe('PrismaAccountLockAdapter', () => {
  describe('recordFailedLogin', () => {
    it('Redis 不可用 → 不計數，回傳 0，不打 DB', async () => {
      const redis = makeRedis({ isAvailable: false });
      const prisma = makePrisma();
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        redis as unknown as RedisService,
      );

      const result = await adapter.recordFailedLogin('a@b.com');

      expect(result).toBe(0);
      expect(redis.increment).not.toHaveBeenCalled();
      expect(
        (prisma.userRecord as unknown as { updateMany: jest.Mock }).updateMany,
      ).not.toHaveBeenCalled();
    });

    it('Redis 可用 → INCR 計數並同步寫 DB', async () => {
      const redis = makeRedis({
        increment: jest.fn().mockResolvedValue(3),
      });
      const prismaUpdate = jest.fn().mockResolvedValue({ count: 1 });
      const prisma = makePrisma({ updateMany: prismaUpdate });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        redis as unknown as RedisService,
      );

      const result = await adapter.recordFailedLogin('a@b.com');

      expect(result).toBe(3);
      expect(redis.increment).toHaveBeenCalledWith(
        'joinbar:failed-login:a@b.com',
        1800,
      );
      expect(prismaUpdate).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
        data: { failedLoginCount: 3 },
      });
    });

    it('DB 更新失敗不應阻塞 → 仍回傳 Redis 計數', async () => {
      const redis = makeRedis({
        increment: jest.fn().mockResolvedValue(2),
      });
      const prismaUpdate = jest.fn().mockRejectedValue(new Error('db down'));
      const prisma = makePrisma({ updateMany: prismaUpdate });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        redis as unknown as RedisService,
      );

      const result = await adapter.recordFailedLogin('a@b.com');

      expect(result).toBe(2);
    });
  });

  describe('isLocked', () => {
    it('lockedAt 為 null → false', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ lockedAt: null }),
      });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        makeRedis() as unknown as RedisService,
      );

      expect(await adapter.isLocked('a@b.com')).toBe(false);
    });

    it('lockedAt 有值 → true', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ lockedAt: new Date() }),
      });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        makeRedis() as unknown as RedisService,
      );

      expect(await adapter.isLocked('a@b.com')).toBe(true);
    });

    it('使用者不存在（findUnique 回 null）→ false', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        makeRedis() as unknown as RedisService,
      );

      expect(await adapter.isLocked('a@b.com')).toBe(false);
    });
  });

  describe('lockAccount / unlockAccount', () => {
    it('lockAccount 寫入 lockedAt', async () => {
      const update = jest.fn().mockResolvedValue({ count: 1 });
      const prisma = makePrisma({ updateMany: update });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        makeRedis() as unknown as RedisService,
      );

      await adapter.lockAccount('a@b.com');

      expect(update).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
        data: { lockedAt: expect.any(Date) },
      });
    });

    it('unlockAccount 清空 Redis 計數並重置 DB 欄位', async () => {
      const redis = makeRedis();
      const update = jest.fn().mockResolvedValue({ count: 1 });
      const prisma = makePrisma({ updateMany: update });
      const adapter = new PrismaAccountLockAdapter(
        prisma,
        redis as unknown as RedisService,
      );

      await adapter.unlockAccount('a@b.com');

      expect(redis.del).toHaveBeenCalledWith('joinbar:failed-login:a@b.com');
      expect(update).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
        data: { failedLoginCount: 0, lockedAt: null },
      });
    });
  });
});
