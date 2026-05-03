import * as dotenv from 'dotenv';
dotenv.config();

import { LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

/**
 * 啟動時過濾 NestJS 內建的 InstanceLoader / RoutesResolver / RouterExplorer info log
 */
const NOISY_BOOT_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
]);

class BootFilteredLogger implements LoggerService {
  constructor(private readonly inner: LoggerService) {}

  log(message: unknown, ...params: unknown[]): void {
    const context = this.pickContext(params);
    if (context && NOISY_BOOT_CONTEXTS.has(context)) return;
    this.inner.log?.(message, ...params);
  }
  error(message: unknown, ...params: unknown[]): void {
    this.inner.error?.(message, ...params);
  }
  warn(message: unknown, ...params: unknown[]): void {
    this.inner.warn?.(message, ...params);
  }
  debug(message: unknown, ...params: unknown[]): void {
    this.inner.debug?.(message, ...params);
  }
  verbose(message: unknown, ...params: unknown[]): void {
    this.inner.verbose?.(message, ...params);
  }
  fatal(message: unknown, ...params: unknown[]): void {
    this.inner.fatal?.(message, ...params);
  }

  // Nest Logger 會用第一或最後一個參數傳 context
  private pickContext(params: unknown[]): string | undefined {
    const last = params[params.length - 1];
    return typeof last === 'string' ? last : undefined;
  }
}

// cookie-parser 採用 `module.exports = function`，需用 CJS 形式 import
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import * as swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { getEnv } from './infrastructure/validate-env';

const loadSwaggerDocument = (): object => {
  try {
    const swaggerPath = join(process.cwd(), 'docs/swagger/openapi.bundle.yaml');
    return yaml.load(readFileSync(swaggerPath, 'utf8')) as object;
  } catch {
    return {
      openapi: '3.0.0',
      info: { title: 'JoinBar API', version: '1.0.0' },
      paths: {},
    };
  }
};

const bootstrap = async (): Promise<void> => {
  const env = getEnv();

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    { bufferLogs: true },
  );

  app.use(cookieParser(env.COOKIE_SECRET));

  // CORS_ORIGIN 已被 zod transform 為陣列，可直接交給 enableCors。
  // 配合 credentials: true 必須是明確 origin（不可為 *），由 validate-env 在
  // production block 把關。
  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const swaggerDocument = loadSwaggerDocument();

  // 以 JSON 提供 OpenAPI spec（前端 API client codegen 使用）
  app.use('/api/docs-json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(swaggerDocument));
  });

  app.use(
    '/api/docs',
    // Swagger spec 會隨每次 deploy 變動，禁止 CDN / 瀏覽器 cache
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.setHeader('Pragma', 'no-cache');
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument as Parameters<typeof swaggerUi.setup>[0], {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        docExpansion: 'none',
      },
    }),
  );

  app.useLogger(new BootFilteredLogger(app.get(Logger)));
  app.flushLogs();

  app.enableShutdownHooks();

  await app.listen(env.PORT);
  app
    .get(Logger)
    .log(`Swagger 文件：http://localhost:${env.PORT}/api/docs`, 'Bootstrap');
  app.get(Logger).log(`應用程式啟動：${await app.getUrl()}`, 'Bootstrap');
};

bootstrap();
