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

## 環境變數預設值翻轉：APPLICATION_IS_LOGOUT_AFTER_PASSWORD_RESET

`validate-env.ts` 的 `APPLICATION_IS_LOGOUT_AFTER_PASSWORD_RESET` 預設由 `false` 翻轉為 `true`（OWASP ASVS V3.3 建議：重設密碼後應強制登出所有 session）。

**對既有部署的影響**：未明示設定此 env 的環境，密碼重設後會清空使用者所有 session，前端需處理隨後的 401 → 重新登入流程。release notes 須提示。

## 環境變數移除：GOOGLE_RECAPTCHA_IS_PRODUCTION → 改綁 NODE_ENV

reCAPTCHA 是否啟用實際驗證改由 `NODE_ENV === 'production'` 判斷，移除原獨立旗標 `GOOGLE_RECAPTCHA_IS_PRODUCTION`。

理由：避免「production 部署誤把旗標設成 false → 驗證 silent bypass」的 footgun。

**Breaking 行為**：

- 之前以 `GOOGLE_RECAPTCHA_IS_PRODUCTION=false` 在 production 暫時關閉驗證的部署，會立即啟用驗證。應改用 `APPLICATION_GOOGLE_RECAPTCHA_ENABLED=false`。
- production 啟動會檢查 `APPLICATION_GOOGLE_RECAPTCHA_ENABLED && !GOOGLE_RECAPTCHA_SECRET`，缺 secret 直接退出。

## BarModule 需同時 import AuthModule + JwtModule

`JwtAuthGuard` 依賴 `JwtService`（來自 `JwtModule`），與 `UserModule` 相同。
只 import `AuthModule` 不夠，E2E 啟動時會拋 "JwtService not available in BarModule"。
所有掛 `JwtAuthGuard` 的 feature module 都需要 `imports: [AuthModule, JwtModule]`。

## BarListResponse.items 型別需對齊 UseCase 回傳型別

列表 DTO（`BarListResponse`）的 items 型別直接 import `BarListItem`（port/in 層）而非 `BarResponse`，
避免 `BarListItem` 缺少 `googlePlaceId / createdAt / updatedAt` 造成 TypeScript 型別不相容。
規則：response DTO 的型別應與 use case 回傳結構對齊，不要強制轉型成 controller-layer class。

## E2E mock：mockPrisma 需含 $transaction

`PrismaUserRepository.updatePassword` 使用 `$transaction`（陣列形式）。
E2E 的 `mockPrisma` 若缺少此方法，ChangePassword 端點會拋 500。
修法：`$transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops))`

## E2E mock：FULL_USER_RECORD 需包含所有欄位

`JwtAuthGuard.loadUserContext` 讀取 `userRecord.findUnique` 的結果，
會判斷 `deletedAt`、`lockedAt`、`failedLoginCount` 等欄位。
若 mock 物件缺欄位（undefined），條件判斷結果不同，會產生非預期的 403/401。
建議：E2E 只建一個 `FULL_USER_RECORD` 含全欄位，局部覆寫用 spread。

## @Post() endpoint 回傳 201，openspec 要求 200 時需加 @HttpCode

NestJS `@Post()` 預設 HTTP 201，若規格定義 200 需明確加 `@HttpCode(HttpStatus.OK)`。

## E2E mock：$transaction 需同時支援 batch 與 interactive 兩種形式

`PrismaService.$transaction` 有兩種呼叫方式：

- **batch**：`$transaction([p1, p2, ...])`（陣列，`Promise.all`）
- **interactive**：`$transaction(async (tx) => { ... }, { isolationLevel })`（callback）

原始 mock 只處理 batch 形式：

```typescript
$transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops));
```

若新增使用 interactive transaction 的 repository 方法（例如 TOCTOU 問題修正），E2E 會拋
`TypeError: ops is not iterable` → 500，且 try-catch 會把錯誤重新拋出，難以察覺根因。

**修法**：拆成兩步驟避免 TypeScript 循環型別推導錯誤：

```typescript
const mockPrisma = {
  $transaction: jest.fn(),
  // ...其餘欄位
};

// 物件定義完成後再設實作，才能在 callback 中引用 mockPrisma
mockPrisma.$transaction.mockImplementation(
  async (
    callbackOrOps: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[],
  ) => {
    if (typeof callbackOrOps === 'function') {
      return callbackOrOps(mockPrisma);
    }
    return Promise.all(callbackOrOps);
  },
);
```

注意：`jest.clearAllMocks()` 不會清除 `mockImplementation`，只有 `jest.resetAllMocks()` 才會。
因此此寫法在 `beforeEach` 執行 `clearAllMocks` 後仍有效，無需在每個 test 重新設定。

## CORS_ORIGIN production 預設值防呆

`CORS_ORIGIN` 改為陣列（逗號分隔），預設含 `http://localhost:5173,http://localhost:3000`。production 額外阻擋：

- 包含 `*`
- 陣列為空
- 含 `localhost` / `127.0.0.1`（避免預設值靜默保留到 production）
