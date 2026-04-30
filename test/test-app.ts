import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

export interface TestAppOverrides {
  prisma?: Record<string, unknown>;
}

/**
 * 建立 NestExpressApplication 測試實例。
 * 集中管理 global prefix 等共用設定，避免各 E2E spec 重複撰寫。
 */
export async function createE2EApp(overrides: TestAppOverrides = {}): Promise<{
  app: NestExpressApplication;
  moduleRef: TestingModule;
}> {
  const mockPrisma = overrides.prisma ?? {};

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  } as ModuleMetadata)
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>(
    new ExpressAdapter(),
    { forceCloseConnections: true },
  );
  app.setGlobalPrefix('api');
  await app.init();

  return { app, moduleRef };
}
