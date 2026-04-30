import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { getEnv } from '../validate-env';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private readonly MAX_RETRIES = 5;
  private _keyPrefix = '';
  private defaultTtl = 0;

  async onModuleInit(): Promise<void> {
    const env = getEnv();
    this._keyPrefix = env.REDIS_KEY_PREFIX;
    this.defaultTtl = env.REDIS_TTL;

    const reconnectStrategy = (retries: number): number | Error => {
      if (retries >= this.MAX_RETRIES) {
        this.logger.error('Redis 重試次數已達上限，停止重試');
        return new Error('Redis 連線失敗');
      }
      const delay = Math.min(retries * 1000, 10000);
      this.logger.warn(`Redis 重新連線中 (第 ${retries + 1} 次，延遲 ${delay}ms)`);
      return delay;
    };

    // 優先使用 REDIS_URL（適用 Redis Cloud 等雲端服務）
    this.client = (
      env.REDIS_URL
        ? createClient({ url: env.REDIS_URL, socket: { reconnectStrategy } })
        : createClient({
            socket: {
              host: env.REDIS_HOST,
              port: env.REDIS_PORT,
              reconnectStrategy,
            },
            password: env.REDIS_PASSWORD,
            database: env.REDIS_DB,
          })
    ) as RedisClientType;

    this.client.on('connect', () => this.logger.log('Redis 連線成功'));
    this.client.on('error', (err) =>
      this.logger.error('Redis 錯誤', err.message),
    );
    this.client.on('end', () => this.logger.warn('Redis 連線已結束'));

    await this.client.connect().catch((err) => {
      this.logger.error('Redis 初始連線失敗', err.message);
      this.logger.warn('應用程式將在無 Redis 的情況下運行');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.logger.log('Redis 連線已關閉');
    }
  }

  get isAvailable(): boolean {
    return this.client?.isOpen ?? false;
  }

  get keyPrefix(): string {
    return this._keyPrefix;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client?.isOpen) return;
    const ttl = ttlSeconds ?? this.defaultTtl;
    if (ttl > 0) {
      await this.client.set(key, value, { EX: ttl });
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client?.isOpen) return null;
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.client?.isOpen) return;
    await this.client.del(key);
  }

  /**
   * 原子性 INCR + 首次 TTL 設定。
   * Redis 不可用時 graceful degradation，回傳 0。
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client?.isOpen) return 0;
    try {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch {
      return 0;
    }
  }

  async addToBlacklist(token: string, ttlSeconds: number): Promise<void> {
    const hash = createHash('sha256').update(token).digest('hex').slice(0, 32);
    await this.set(`${this._keyPrefix}blacklist:${hash}`, '1', ttlSeconds);
  }

  /**
   * Token 黑名單確認。
   * Redis 不可用時採 fail-closed 策略，避免已登出 token 繼續使用。
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.client?.isOpen) {
      throw new ServiceUnavailableException('認證服務暫時不可用，請稍後再試');
    }
    const hash = createHash('sha256').update(token).digest('hex').slice(0, 32);
    const result = await this.get(`${this._keyPrefix}blacklist:${hash}`);
    return result !== null;
  }

  /**
   * 原子性滑動視窗計數（Lua Script via EVAL）。
   * Redis 不可用時回傳 0（靜默降級，不節流）。
   */
  async throttleIncrement(key: string, ttlMs: number): Promise<number> {
    if (!this.client?.isOpen) {
      this.logger.warn('[Throttle] Redis 不可用，節流保護暫時停用');
      return 0;
    }
    const now = Date.now();
    const script = [
      'local key = KEYS[1]',
      'local now = tonumber(ARGV[1])',
      'local window = tonumber(ARGV[2])',
      'redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window)',
      'redis.call("ZADD", key, now, tostring(now))',
      'redis.call("PEXPIRE", key, window)',
      'return redis.call("ZCARD", key)',
    ].join('\n');
    const count = await this.client.eval(script, {
      keys: [key],
      arguments: [String(now), String(ttlMs)],
    });
    return Number(count);
  }
}
