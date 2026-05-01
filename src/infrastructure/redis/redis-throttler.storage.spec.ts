import { RedisThrottlerStorage } from './redis-throttler.storage';
import { RedisService } from './redis.service';

const makeRedis = (throttleIncrement: jest.Mock): RedisService =>
  ({
    throttleIncrement,
  }) as unknown as RedisService;

describe('RedisThrottlerStorage', () => {
  it('未超過 limit → isBlocked = false、totalHits 為 Redis 回傳值', async () => {
    const inc = jest.fn().mockResolvedValue(3);
    const storage = new RedisThrottlerStorage(makeRedis(inc));

    const result = await storage.increment('user:1', 60000, 100, 0, 'common');

    expect(result.totalHits).toBe(3);
    expect(result.isBlocked).toBe(false);
    expect(result.timeToExpire).toBe(60); // ceil(60000/1000)
    expect(result.timeToBlockExpire).toBe(0);
    expect(inc).toHaveBeenCalledWith('throttler:user:1:common', 60000);
  });

  it('超過 limit → isBlocked = true、timeToBlockExpire = timeToExpire', async () => {
    const inc = jest.fn().mockResolvedValue(101);
    const storage = new RedisThrottlerStorage(makeRedis(inc));

    const result = await storage.increment('user:1', 60000, 100, 0, 'common');

    expect(result.isBlocked).toBe(true);
    expect(result.timeToBlockExpire).toBe(60);
  });

  it('Redis 不可用（回傳 0）→ totalHits=0、isBlocked=false（節流停用）', async () => {
    const inc = jest.fn().mockResolvedValue(0);
    const storage = new RedisThrottlerStorage(makeRedis(inc));

    const result = await storage.increment('user:1', 60000, 100, 0, 'common');

    expect(result.totalHits).toBe(0);
    expect(result.isBlocked).toBe(false);
    expect(result.timeToExpire).toBe(0);
  });
});
