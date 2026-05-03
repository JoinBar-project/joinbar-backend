import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { SAVE_SYSTEM_LOG_PORT } from '../src/application/port/out/shared/SaveSystemLogPort';
import { FILE_STORAGE_PORT } from '../src/application/port/out/shared/FileStoragePort';
import { GEMINI_PORT } from '../src/application/port/out/shared/GeminiPort';

export interface TestAppOverrides {
  prisma?: Record<string, unknown>;
  redis?: ReturnType<typeof createMockRedis>;
  saveSystemLog?: Record<string, unknown>;
  fileStorage?: Record<string, unknown>;
  gemini?: Record<string, unknown>;
}

/**
 * 每次呼叫回傳全新獨立的 Redis mock 實例，
 * 避免多個 E2E spec 共用同一物件導致狀態汙染。
 */
export const createMockRedis = () => ({
  isAvailable: true,
  keyPrefix: 'joinbar:',
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  addToBlacklist: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  throttleIncrement: jest.fn().mockResolvedValue(1),
  increment: jest.fn().mockResolvedValue(1),
});

/** 每次呼叫回傳全新的 SaveSystemLog mock 實例 */
export const createMockSaveSystemLog = () => ({
  saveSystemLog: jest.fn().mockResolvedValue(undefined),
});

/** 每次呼叫回傳全新的 FileStoragePort mock 實例 */
export const createMockFileStorage = () => ({
  upload: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-storage/signed'),
  delete: jest.fn().mockResolvedValue(undefined),
});

/** 每次呼叫回傳全新的 GeminiPort mock 實例 */
export const createMockGemini = () => ({
  generate: jest.fn().mockResolvedValue('這是 AI 生成的酒吧描述文字'),
});

/**
 * 建立 NestExpressApplication 測試實例。
 * 集中管理 global prefix 等共用設定，避免各 E2E spec 重複撰寫。
 *
 * 使用方式：
 * ```typescript
 * const mockRedis = createMockRedis();
 * const { app } = await createE2EApp({ prisma: mockPrisma, redis: mockRedis });
 * ```
 */
export async function createE2EApp(overrides: TestAppOverrides = {}): Promise<{
  app: NestExpressApplication;
  moduleRef: TestingModule;
}> {
  const mockPrisma = overrides.prisma ?? {};
  const mockRedis = overrides.redis ?? createMockRedis();
  const mockLog = overrides.saveSystemLog ?? createMockSaveSystemLog();
  const mockFileStorage = overrides.fileStorage ?? createMockFileStorage();
  const mockGemini = overrides.gemini ?? createMockGemini();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  } as ModuleMetadata)
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .overrideProvider(RedisService)
    .useValue(mockRedis)
    .overrideProvider(SAVE_SYSTEM_LOG_PORT)
    .useValue(mockLog)
    .overrideProvider(FILE_STORAGE_PORT)
    .useValue(mockFileStorage)
    .overrideProvider(GEMINI_PORT)
    .useValue(mockGemini)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>(
    new ExpressAdapter(),
    { forceCloseConnections: true },
  );
  app.setGlobalPrefix('api');
  await app.init();

  return { app, moduleRef };
}
