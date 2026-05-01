import bcrypt from 'bcrypt';
import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createE2EApp, createMockRedis } from './test-app';

// ── テストデータ / 測試資料 ──────────────────────────────────────────────
const TEST_PASSWORD = 'TestPass123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 1); // rounds=1，加速測試
const USER_UUID = '00000000-0000-0000-0000-000000000001';
const TEST_EMAIL = 'test@example.com';

/**
 * findByEmailWithPassword → userAuthProvider.findFirst 回傳值
 * （含 user relation，供 PrismaUserRepository.toUser() 轉換）
 */
const EMAIL_PROVIDER_RECORD = {
  id: 'provider-001',
  userId: USER_UUID,
  provider: 'EMAIL',
  email: TEST_EMAIL,
  password: TEST_HASH,
  user: {
    id: USER_UUID,
    email: TEST_EMAIL,
    username: 'Test User',
    nickname: null,
    role: 'USER',
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
  },
};

/** 停用帳號：deletedAt が設定済み（isActive() → false） */
const DISABLED_PROVIDER_RECORD = {
  ...EMAIL_PROVIDER_RECORD,
  user: {
    ...EMAIL_PROVIDER_RECORD.user,
    deletedAt: new Date('2024-06-01'),
  },
};

/**
 * loadUserContext → userRecord.findUnique 回傳值
 * JwtAuthGuard / RefreshTokenService が使用する
 */
const USER_CONTEXT_RECORD = {
  id: USER_UUID,
  email: TEST_EMAIL,
  role: 'USER',
  deletedAt: null,
  lastPasswordChange: null,
};

// ── Prisma Mock ──────────────────────────────────────────────────────────
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  userAuthProvider: {
    findFirst: jest.fn(),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    upsert: jest.fn().mockResolvedValue({}),
  },
  userRecord: {
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  authLogRecord: {
    create: jest.fn().mockResolvedValue({}),
  },
  passwordResetTokenRecord: {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({}),
  },
};

const mockRedis = createMockRedis();

// ── E2E テストスイート / E2E 測試套件 ────────────────────────────────────
describe('Auth E2E', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await createE2EApp({ prisma: mockPrisma, redis: mockRedis }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Redis 預設狀態（不在黑名單、throttle 未觸發、快取未命中）
    mockRedis.get.mockResolvedValue(null);
    mockRedis.isTokenBlacklisted.mockResolvedValue(false);
    mockRedis.throttleIncrement.mockResolvedValue(1);
    // Prisma 預設狀態
    mockPrisma.userAuthProvider.findFirst.mockResolvedValue(null);
    mockPrisma.userRecord.findUnique.mockResolvedValue(USER_CONTEXT_RECORD);
    mockPrisma.userAuthProvider.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.authLogRecord.create.mockResolvedValue({});
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('正確憑證 → 200 + 雙 token + user 資訊', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      const { data } = res.body as { data: Record<string, unknown> };
      expect(typeof data.accessToken).toBe('string');
      expect(typeof data.refreshToken).toBe('string');
      expect(data.accessTokenExpiresIn).toBeGreaterThan(0);
      expect(data.refreshTokenExpiresIn).toBeGreaterThan(0);
      expect((data.user as Record<string, unknown>).id).toBe(USER_UUID);
      expect((data.user as Record<string, unknown>).email).toBe(TEST_EMAIL);
    });

    it('無效 email 格式 → 400 Zod 驗證錯誤', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'AnyPass1!' });

      expect(res.status).toBe(400);
    });

    it('使用者不存在 → 401', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'AnyPass1!' });

      expect(res.status).toBe(401);
    });

    it('密碼錯誤 → 401', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPass1!' });

      expect(res.status).toBe(401);
    });

    it('帳號停用（deletedAt ≠ null） → 403 ACCOUNT_DISABLED', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        DISABLED_PROVIDER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(403);
      expect((res.body as { code: string }).code).toBe('ACCOUNT_DISABLED');
    });

    it('test env 不需 recaptchaToken → 200（feature flag 預設 false = bypass）', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      // 未傳 recaptchaToken；APPLICATION_GOOGLE_RECAPTCHA_ENABLED 預設 false → 不驗證

      expect(res.status).toBe(200);
    });
  });

  // ── POST /api/auth/logout ─────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('無 JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({});

      expect(res.status).toBe(401);
    });

    it('login → logout → 204，access + refresh token 加入黑名單', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      expect(loginRes.status).toBe(200);

      const { accessToken, refreshToken } = (
        loginRes.body as { data: Record<string, string> }
      ).data;

      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(204);
      expect(mockRedis.addToBlacklist).toHaveBeenCalledWith(
        accessToken,
        expect.any(Number),
      );
      expect(mockRedis.addToBlacklist).toHaveBeenCalledWith(
        refreshToken,
        expect.any(Number),
      );
    });
  });

  // ── POST /api/auth/refresh ────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('有效 refresh token → 200 + 新 access token', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      expect(loginRes.status).toBe(200);

      const { refreshToken } = (
        loginRes.body as { data: Record<string, string> }
      ).data;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      const { data } = res.body as { data: Record<string, unknown> };
      expect(typeof data.accessToken).toBe('string');
      expect(data.accessTokenExpiresIn).toBeGreaterThan(0);
    });

    it('缺少 refreshToken → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    it('無效 refresh token → 401 INVALID_REFRESH_TOKEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not-a-valid-jwt' });

      expect(res.status).toBe(401);
      expect((res.body as { code: string }).code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('以 access token 呼叫 refresh → 401 INVALID_REFRESH_TOKEN（type 不符）', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      const { accessToken } = (
        loginRes.body as { data: Record<string, string> }
      ).data;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken });

      expect(res.status).toBe(401);
      expect((res.body as { code: string }).code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('refresh token 在黑名單 → 401 INVALID_REFRESH_TOKEN', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      const { refreshToken } = (
        loginRes.body as { data: Record<string, string> }
      ).data;

      mockRedis.isTokenBlacklisted.mockResolvedValue(true);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect((res.body as { code: string }).code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('帳號停用 → 403 ACCOUNT_DISABLED', async () => {
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      const { refreshToken } = (
        loginRes.body as { data: Record<string, string> }
      ).data;

      // 換發時 loadUserContext 回傳停用帳號
      mockPrisma.userRecord.findUnique.mockResolvedValue({
        ...USER_CONTEXT_RECORD,
        deletedAt: new Date('2024-06-01'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(403);
      expect((res.body as { code: string }).code).toBe('ACCOUNT_DISABLED');
    });
  });

  // ── Rate Limiting ─────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('超過速率限制 → 429', async () => {
      mockRedis.throttleIncrement.mockResolvedValue(101); // 超過預設 limit=100

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'AnyPass1!' });

      expect(res.status).toBe(429);
    });
  });
});
