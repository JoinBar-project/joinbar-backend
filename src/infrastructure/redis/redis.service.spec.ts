import { ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from './redis.service';

jest.mock('../validate-env', () => ({
  getEnv: () => ({
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: undefined,
    REDIS_DB: 0,
    REDIS_KEY_PREFIX: 'joinbar:',
    REDIS_TTL: 0,
    REDIS_URL: undefined,
  }),
}));

interface FakeClient {
  isOpen: boolean;
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  incr: jest.Mock;
  expire: jest.Mock;
  eval: jest.Mock;
}

const makeClient = (overrides: Partial<FakeClient> = {}): FakeClient => ({
  isOpen: true,
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  eval: jest.fn().mockResolvedValue(1),
  ...overrides,
});

const inject = (
  service: RedisService,
  client: FakeClient | null,
  keyPrefix = 'joinbar:',
): void => {
  // 跳過 onModuleInit，直接以受控的 client / prefix 做單元測試
  (service as unknown as { client: FakeClient | null }).client = client;
  (service as unknown as { _keyPrefix: string })._keyPrefix = keyPrefix;
  (service as unknown as { defaultTtl: number }).defaultTtl = 0;
};

describe('RedisService', () => {
  describe('isAvailable', () => {
    it('client 為 null → false', () => {
      const service = new RedisService();
      inject(service, null);
      expect(service.isAvailable).toBe(false);
    });

    it('client.isOpen = false → false', () => {
      const service = new RedisService();
      inject(service, makeClient({ isOpen: false }));
      expect(service.isAvailable).toBe(false);
    });

    it('client.isOpen = true → true', () => {
      const service = new RedisService();
      inject(service, makeClient());
      expect(service.isAvailable).toBe(true);
    });
  });

  describe('靜默降級（Redis 不可用時不拋）', () => {
    it('set / get / del Redis 不可用 → no-op、null、no-op', async () => {
      const service = new RedisService();
      inject(service, null);

      await expect(service.set('k', 'v')).resolves.toBeUndefined();
      await expect(service.get('k')).resolves.toBeNull();
      await expect(service.del('k')).resolves.toBeUndefined();
    });

    it('increment Redis 不可用 → 回傳 0', async () => {
      const service = new RedisService();
      inject(service, null);

      await expect(service.increment('k', 60)).resolves.toBe(0);
    });

    it('throttleIncrement Redis 不可用 → 回傳 0（節流停用）', async () => {
      const service = new RedisService();
      inject(service, null);

      await expect(service.throttleIncrement('k', 60000)).resolves.toBe(0);
    });
  });

  describe('isTokenBlacklisted（fail-closed）', () => {
    it('Redis 不可用 → 拋 ServiceUnavailableException', async () => {
      const service = new RedisService();
      inject(service, null);

      await expect(service.isTokenBlacklisted('any')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('Redis 可用且 hash 存在 → true', async () => {
      const client = makeClient({
        get: jest.fn().mockResolvedValue('1'),
      });
      const service = new RedisService();
      inject(service, client);

      await expect(service.isTokenBlacklisted('any-token')).resolves.toBe(true);
      // key prefix 與 hash slice(0, 32) 已套用
      expect(client.get).toHaveBeenCalledWith(
        expect.stringMatching(/^joinbar:blacklist:[a-f0-9]{32}$/),
      );
    });

    it('Redis 可用但 hash 不存在 → false', async () => {
      const client = makeClient({
        get: jest.fn().mockResolvedValue(null),
      });
      const service = new RedisService();
      inject(service, client);

      await expect(service.isTokenBlacklisted('any-token')).resolves.toBe(
        false,
      );
    });
  });

  describe('increment（首次計數時設定 TTL）', () => {
    it('回傳 1 → 同時呼叫 expire(ttl)', async () => {
      const client = makeClient({
        incr: jest.fn().mockResolvedValue(1),
      });
      const service = new RedisService();
      inject(service, client);

      await service.increment('k', 60);

      expect(client.expire).toHaveBeenCalledWith('k', 60);
    });

    it('回傳 > 1 → 不再設 TTL', async () => {
      const client = makeClient({
        incr: jest.fn().mockResolvedValue(5),
      });
      const service = new RedisService();
      inject(service, client);

      await service.increment('k', 60);

      expect(client.expire).not.toHaveBeenCalled();
    });
  });
});
