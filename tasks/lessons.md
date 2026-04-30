# 踩坑記錄

過去修正過的問題與注意事項，永不刪除條目。

## Prisma v7：datasource url 移至 prisma.config.ts

Prisma v7 breaking change：`schema.prisma` 的 `datasource` 不再支援 `url` 欄位。
需建立 `prisma.config.ts`，以 `defineConfig` 傳入連線字串。
`prisma validate` 需先執行 `npm install` 才能載入 `prisma/config` 模組。

## Prisma v7：必須使用 driver adapter（@prisma/adapter-pg）

Prisma v7 預設 engine 改為 WASM-based "client" engine，**強制要求 driver adapter 或 accelerateUrl**。

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

套件：`@prisma/adapter-pg`（dependencies）、`pg`（dependencies）、`@types/pg`（devDependencies）。
`PrismaService`、`seed-runner.ts` 等所有建立 PrismaClient 的地方都必須套用此模式。
`new PrismaClient()` 不傳引數會拋 `PrismaClientInitializationError`（undefined 是 falsy）。
