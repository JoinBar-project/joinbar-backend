import bcrypt from 'bcrypt';
import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createE2EApp, createMockGemini, createMockRedis } from './test-app';

// ── 測試資料 ──────────────────────────────────────────────────────��──────
const TEST_PASSWORD = 'TestPass123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 1);
const USER_UUID = '00000000-0000-0000-0000-000000000001';
const BAR_UUID = '00000000-0000-0000-0000-000000000002';
const TEST_EMAIL = 'alice@example.com';

const EMAIL_PROVIDER_RECORD = {
  id: 'provider-001',
  userId: USER_UUID,
  provider: 'EMAIL',
  email: TEST_EMAIL,
  password: TEST_HASH,
  user: {
    id: USER_UUID,
    email: TEST_EMAIL,
    username: 'alice',
    nickname: null,
    role: 'ADMIN',
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
  },
};

const USER_RECORD = {
  id: USER_UUID,
  email: TEST_EMAIL,
  username: 'alice',
  nickname: null,
  role: 'ADMIN',
  failedLoginCount: 0,
  lockedAt: null,
  lastPasswordChange: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const BAR_RECORD = {
  id: BAR_UUID,
  name: '運動酒吧',
  address: '台北市信義區',
  phone: '02-1234-5678',
  website: null,
  imageUrl: null,
  latitude: { toNumber: () => 25.033 },
  longitude: { toNumber: () => 121.565 },
  googlePlaceId: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  barTag: {
    barId: BAR_UUID,
    sport: true,
    music: false,
    student: false,
    bistro: false,
    drink: true,
    joy: false,
    romantic: false,
    oldschool: false,
    highlevel: false,
    easy: false,
  },
};

// ── Prisma Mock ──────────────────────────────────────────────────────────
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  userAuthProvider: {
    findFirst: jest.fn(),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
  },
  userRecord: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  authLogRecord: {
    create: jest.fn().mockResolvedValue({}),
  },
  passwordResetTokenRecord: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  bar: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedis = createMockRedis();
const mockGemini = createMockGemini();

// ── E2E 測試套件 ─────────────────────────────────────────────────────────
describe('Bar E2E', () => {
  let app: NestExpressApplication;
  let accessToken: string;

  beforeAll(async () => {
    ({ app } = await createE2EApp({
      prisma: mockPrisma,
      redis: mockRedis,
      gemini: mockGemini,
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.isTokenBlacklisted.mockResolvedValue(false);
    mockRedis.throttleIncrement.mockResolvedValue(1);
    mockPrisma.userRecord.findUnique.mockResolvedValue(USER_RECORD);
    mockPrisma.userAuthProvider.findFirst.mockResolvedValue(null);
    mockPrisma.bar.findUnique.mockResolvedValue(BAR_RECORD);
    mockPrisma.bar.findMany.mockResolvedValue([BAR_RECORD]);
    mockPrisma.bar.count.mockResolvedValue(1);
    mockPrisma.bar.create.mockResolvedValue(BAR_RECORD);
    mockPrisma.bar.update.mockResolvedValue(BAR_RECORD);
    mockGemini.generate.mockResolvedValue('這是 AI 生成的酒吧描述文字');
  });

  const getToken = async (): Promise<string> => {
    mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
      EMAIL_PROVIDER_RECORD,
    );
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    mockPrisma.userAuthProvider.findFirst.mockResolvedValue(null);
    return (res.body as { data: { accessToken: string } }).data.accessToken;
  };

  // ── GET /api/bars ───────────────────────────────────────────────────

  describe('GET /api/bars', () => {
    it('無需 JWT，回傳酒吧列表與分頁 meta', async () => {
      const res = await request(app.getHttpServer()).get('/api/bars');

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(Array.isArray((data as { items: unknown[] }).items)).toBe(true);
      expect((data as { meta: { total: number } }).meta.total).toBe(1);
    });

    it('標籤篩選 → 200', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/bars?tags=sport,drink',
      );
      expect(res.status).toBe(200);
    });

    it('關鍵字搜尋 → 200', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/bars?keyword=運動',
      );
      expect(res.status).toBe(200);
    });

    it('非法 tags → 400', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/bars?tags=invalid',
      );
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/bars/:id ───────────────────────────────────────────────

  describe('GET /api/bars/:id', () => {
    it('無需 JWT，回傳酒吧詳情', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/bars/${BAR_UUID}`,
      );

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data.id).toBe(BAR_UUID);
      expect(Array.isArray(data.tags)).toBe(true);
    });

    it('不存在的 id → 404', async () => {
      mockPrisma.bar.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        `/api/bars/${BAR_UUID}`,
      );
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/bars ──────────────────────────────────────────────────

  describe('POST /api/bars', () => {
    it('建立酒吧 → 201', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post('/api/bars')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '新酒吧', tags: { sport: true } });

      expect(res.status).toBe(201);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data.id).toBe(BAR_UUID);
    });

    it('缺少 name → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post('/api/bars')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ address: '台北市' });

      expect(res.status).toBe(400);
    });

    it('未帶 JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bars')
        .send({ name: '新酒吧' });

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/bars/:id ─────────────────────────────────────────────

  describe('PATCH /api/bars/:id', () => {
    it('更新 name → 200', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .patch(`/api/bars/${BAR_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '新名稱' });

      expect(res.status).toBe(200);
    });

    it('空 body → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .patch(`/api/bars/${BAR_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('不存在的 id → 404', async () => {
      accessToken = await getToken();
      mockPrisma.bar.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch(`/api/bars/${BAR_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '新名稱' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/bars/:id ────────────────────────────────────────────

  describe('DELETE /api/bars/:id', () => {
    it('刪除後 204，再次查詢 404', async () => {
      accessToken = await getToken();

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/bars/${BAR_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteRes.status).toBe(204);

      mockPrisma.bar.findUnique.mockResolvedValue(null);

      const getRes = await request(app.getHttpServer()).get(
        `/api/bars/${BAR_UUID}`,
      );
      expect(getRes.status).toBe(404);
    });
  });

  // ── POST /api/bars/:id/describe ─────────────────────────────────────

  describe('POST /api/bars/:id/describe', () => {
    it('geminiEnabled=true → 200 + description', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post(`/api/bars/${BAR_UUID}/describe`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(typeof data.description).toBe('string');
    });

    it('不存在的 id → 404', async () => {
      accessToken = await getToken();
      mockPrisma.bar.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/api/bars/${BAR_UUID}/describe`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
