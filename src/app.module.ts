import { Module, RequestMethod } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { RedisService } from './infrastructure/redis/redis.service';
import { RedisThrottlerStorage } from './infrastructure/redis/redis-throttler.storage';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './modules/redis.module';
import { FeatureFlagModule } from './modules/feature-flag.module';
import { AuthLogModule } from './modules/auth-log.module';
import { SecurityModule } from './modules/security.module';
import { SystemLogModule } from './modules/system-log.module';
import { EmailModule } from './modules/email.module';
import { FirebaseModule } from './modules/firebase.module';
import { RecaptchaModule } from './modules/recaptcha.module';
import { StorageModule } from './modules/storage.module';
import { AuthModule } from './modules/auth.module';
import { HealthController } from './adapter/in/web/HealthController';
import { GlobalExceptionFilter } from './adapter/in/web/filter/GlobalExceptionFilter';
import { LoggingInterceptor } from './adapter/in/web/interceptor/LoggingInterceptor';
import { TransformInterceptor } from './adapter/in/web/interceptor/TransformInterceptor';
import { IpBlacklistGuard } from './adapter/in/web/guard/IpBlacklistGuard';
import { IpWhitelistGuard } from './adapter/in/web/guard/IpWhitelistGuard';
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
    FeatureFlagModule,
    AuthLogModule,
    SecurityModule,
    SystemLogModule,
    EmailModule,
    FirebaseModule,
    RecaptchaModule,
    StorageModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    // APP_GUARD 的執行順序依照宣告順序：
    // Throttler（流量控制）→ Blacklist（明確拒絕）→ Whitelist（限制 IP）
    //
    // SessionIdleGuard 不在此處註冊：它依賴 request.user（由 JwtAuthGuard 設定），
    // 而 JwtAuthGuard 需要業務模組（如 user.module）提供 LOAD_USER_CONTEXT_PORT。
    // 待 user/auth controller 加入後，於 user.module 內以
    //   @UseGuards(JwtAuthGuard, SessionIdleGuard)
    // 的方式套到需認證的 controller，或統一註冊為 APP_GUARD（順序須在此 3 個之後），
    // 並對公開路由標 @Public() 由 JwtAuthGuard 跳過。
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: IpBlacklistGuard },
    { provide: APP_GUARD, useClass: IpWhitelistGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
