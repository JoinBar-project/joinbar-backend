import bcrypt from 'bcrypt';
import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  createE2EApp,
  createMockFileStorage,
  createMockRedis,
} from './test-app';

// ── 測試資料 ─────────────────────────────────────────────────────────────
const TEST_PASSWORD = 'TestPass123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 1);
const USER_UUID = '00000000-0000-0000-0000-000000000001';
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
    role: 'USER',
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
  },
};

/**
 * 完整 UserRecord：同時滿足 loadUserContext（JwtAuthGuard）
 * 與 findProfileById / findById（user services）的查詢
 */
const FULL_USER_RECORD = {
  id: USER_UUID,
  email: TEST_EMAIL,
  username: 'alice',
  nickname: null,
  role: 'USER',
  birthday: null,
  avatarUrl: null,
  avatarKey: null,
  failedLoginCount: 0,
  lockedAt: null,
  lastPasswordChange: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
};

const mockRedis = createMockRedis();
const mockFileStorage = createMockFileStorage();

// ── E2E 測試套件 ─────────────────────────────────────────────────────────
describe('User E2E', () => {
  let app: NestExpressApplication;
  let accessToken: string;

  beforeAll(async () => {
    ({ app } = await createE2EApp({
      prisma: mockPrisma,
      redis: mockRedis,
      fileStorage: mockFileStorage,
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
    // 預設：全部 findUnique 回傳完整 record（loadUserContext + findProfileById 均適用）
    mockPrisma.userRecord.findUnique.mockResolvedValue(FULL_USER_RECORD);
    mockPrisma.userRecord.update.mockResolvedValue({});
    mockPrisma.userAuthProvider.findFirst.mockResolvedValue(null);
  });

  /** 取得有效 accessToken（依賴 login endpoint） */
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

  beforeAll(async () => {
    // 預先取得 token 供所有測試使用
  });

  // ── GET /api/users/me ───────────────────────────────────────────────

  describe('GET /api/users/me', () => {
    it('有效 JWT → 200 + profile', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique.mockResolvedValue(FULL_USER_RECORD);

      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data.id).toBe(USER_UUID);
      expect(data.username).toBe('alice');
      expect(data.email).toBe(TEST_EMAIL);
    });

    it('未帶 JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/users/me ─────────────────────────────────────────────

  describe('PATCH /api/users/me', () => {
    it('更新 nickname → 200 + 更新後 profile', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique
        .mockResolvedValueOnce(FULL_USER_RECORD) // loadUserContext
        .mockResolvedValueOnce({
          ...FULL_USER_RECORD,
          nickname: '新暱稱',
        });

      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: '新暱稱' });

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data.nickname).toBe('新暱稱');
    });

    it('空 body → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/users/me/password ─────────────────────────────────────

  describe('POST /api/users/me/password', () => {
    it('舊密碼正確 → 204', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique.mockResolvedValue({
        ...FULL_USER_RECORD,
        email: TEST_EMAIL,
      });
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: 'NewPass456@' });

      expect(res.status).toBe(204);
    });

    it('舊密碼錯誤 → 401', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique.mockResolvedValue(FULL_USER_RECORD);
      mockPrisma.userAuthProvider.findFirst.mockResolvedValue(
        EMAIL_PROVIDER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: 'WrongPass!', newPassword: 'NewPass456@' });

      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /api/users/me ────────────────────────────────────────────

  describe('DELETE /api/users/me', () => {
    it('刪除後 204，再次請求 403', async () => {
      accessToken = await getToken();

      const deleteRes = await request(app.getHttpServer())
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteRes.status).toBe(204);

      // 模擬 Redis UserContext 快取已清除，下次重查 DB 回傳 deletedAt 已設定
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.userRecord.findUnique.mockResolvedValue({
        ...FULL_USER_RECORD,
        deletedAt: new Date(),
      });

      const nextRes = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(nextRes.status).toBe(403);
    });
  });

  // ── POST /api/users/me/avatar ───────────────────────────────────────

  describe('POST /api/users/me/avatar', () => {
    it('上傳圖片 → 200 + avatarUrl', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique.mockResolvedValue(FULL_USER_RECORD);

      const res = await request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach(
          'file',
          // JPEG magic bytes (FF D8 FF E0) + padding，通過 magic number 驗證
          Buffer.concat([
            Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
            Buffer.from('fake-content'),
          ]),
          { filename: 'avatar.jpg', contentType: 'image/jpeg' },
        );

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(typeof data.avatarUrl).toBe('string');
    });

    it('未提供 file → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /api/users/me/avatar ─────────────────────────────────────

  describe('DELETE /api/users/me/avatar', () => {
    it('有頭像時刪除 → 204', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique.mockResolvedValue({
        ...FULL_USER_RECORD,
        avatarKey: 'avatars/old.jpg',
      });

      const res = await request(app.getHttpServer())
        .delete('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
      expect(mockFileStorage.delete).toHaveBeenCalledWith('avatars/old.jpg');
    });

    it('無頭像時冪等回傳 204', async () => {
      accessToken = await getToken();
      mockPrisma.userRecord.findUnique.mockResolvedValue(FULL_USER_RECORD);

      const res = await request(app.getHttpServer())
        .delete('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
      expect(mockFileStorage.delete).not.toHaveBeenCalled();
    });
  });
});
