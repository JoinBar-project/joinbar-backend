import { Module, RequestMethod } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { RedisService } from './infrastructure/redis/redis.service';
import { RedisThrottlerStorage } from './infrastructure/redis/redis-throttler.storage';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './modules/redis.module';
import { HealthController } from './adapter/in/web/HealthController';
import { getEnv } from './infrastructure/validate-env';

@Module({
  imports: [
    // Pino logger（request-level logging + pino-pretty / pino-roll）
    LoggerModule.forRootAsync({
      useFactory: () => {
        const env = getEnv();
        const isDev = env.NODE_ENV !== 'production';
        const isTest = env.NODE_ENV === 'test';
        return {
          // Express 5 具名萬用字元，避免 LegacyRouteConverter 警告
          forRoutes: [{ path: '/*path', method: RequestMethod.ALL }],
          pinoHttp: {
            genReqId: () => randomUUID(),
            level: env.LOG_LEVEL,
            name: env.SERVICE_NAME,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.body.password',
                'req.body.token',
              ],
              censor: '[REDACTED]',
            },
            transport: {
              targets: [
                ...(isDev
                  ? [
                      {
                        target: 'pino-pretty',
                        options: { colorize: true, translateTime: 'HH:MM:ss' },
                        level: env.LOG_LEVEL,
                      },
                    ]
                  : []),
                // test 環境不寫入 log 檔案，避免 CI 產生無用的 logs/
                ...(!isTest
                  ? [
                      {
                        target: 'pino-roll',
                        options: {
                          file: 'logs/error.log',
                          limit: { size: '5m', count: 10 },
                          mkdir: true,
                        },
                        level: 'error',
                      },
                      {
                        target: 'pino-roll',
                        options: {
                          file: 'logs/combined.log',
                          limit: { size: '5m', count: 10 },
                          mkdir: true,
                        },
                        level: env.LOG_LEVEL,
                      },
                    ]
                  : []),
              ],
            },
          },
        };
      },
    }),
    // 全域速率限制：使用 Redis 儲存支援水平擴展
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => {
        const env = getEnv();
        return {
          throttlers: [
            {
              ttl: env.COMMON_RATE_LIMIT_WINDOW_MS,
              limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
            },
          ],
          storage: new RedisThrottlerStorage(redis),
        };
      },
    }),
    PrismaModule,
    RedisModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
