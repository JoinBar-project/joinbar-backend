import bcrypt from 'bcrypt';
import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createE2EApp, createMockRedis } from './test-app';

// ── 測試資料 ──────────────────────────────────────────────────────────────
const TEST_PASSWORD = 'TestPass123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 1);
const USER_UUID = '00000000-0000-0000-0000-000000000001';
const OTHER_UUID = '00000000-0000-0000-0000-000000000002';
const EVENT_UUID = '00000000-0000-0000-0000-000000000010';
const MESSAGE_UUID = '00000000-0000-0000-0000-000000000020';
const TAG_UUID = '00000000-0000-0000-0000-000000000030';
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

const USER_RECORD = {
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
  updatedAt: new Date('2024-01-01'),
};

// EventRecord 含 tags 與 _count（PrismaEventRepository.toEventData 所需形狀）
const EVENT_RECORD = {
  id: EVENT_UUID,
  name: '週末運動聚會',
  description: '一起運動吧！',
  barId: null,
  barName: '運動酒吧',
  location: '台北市信義區',
  startAt: new Date('2025-06-01T10:00:00Z'),
  endAt: new Date('2025-06-01T14:00:00Z'),
  maxPeople: 10,
  imageUrl: null,
  price: null,
  hostUser: USER_UUID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
  tags: [{ tag: { id: TAG_UUID, name: '運動' } }],
  _count: { participants: 2 },
};

const TAG_RECORD = { id: TAG_UUID, name: '運動' };

const MESSAGE_RECORD = {
  id: MESSAGE_UUID,
  content: '很期待這個活動！',
  userId: USER_UUID,
  eventId: EVENT_UUID,
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
};

// ── Prisma Mock ──────────────────────────────────────────────────────────
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
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
  eventRecord: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tag: {
    findMany: jest.fn(),
  },
  eventParticipation: {
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  message: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// 支援 interactive transaction（callback）與 batch transaction（陣列）
// mockPrisma 須在此完整定義後才能在 callback 中引用
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

const mockRedis = createMockRedis();

// ── E2E 測試套件 ─────────────────────────────────────────────────────────
describe('Event E2E', () => {
  let app: NestExpressApplication;
  let accessToken: string;

  beforeAll(async () => {
    ({ app } = await createE2EApp({
      prisma: mockPrisma,
      redis: mockRedis,
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
    mockPrisma.eventRecord.findUnique.mockResolvedValue(EVENT_RECORD);
    mockPrisma.eventRecord.findMany.mockResolvedValue([EVENT_RECORD]);
    mockPrisma.eventRecord.count.mockResolvedValue(1);
    mockPrisma.eventRecord.create.mockResolvedValue(EVENT_RECORD);
    mockPrisma.eventRecord.update.mockResolvedValue(EVENT_RECORD);
    mockPrisma.tag.findMany.mockResolvedValue([TAG_RECORD]);
    mockPrisma.eventParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.eventParticipation.count.mockResolvedValue(0);
    mockPrisma.eventParticipation.create.mockResolvedValue({});
    mockPrisma.eventParticipation.delete.mockResolvedValue({});
    mockPrisma.message.findUnique.mockResolvedValue(MESSAGE_RECORD);
    mockPrisma.message.findMany.mockResolvedValue([MESSAGE_RECORD]);
    mockPrisma.message.create.mockResolvedValue(MESSAGE_RECORD);
    mockPrisma.message.update.mockResolvedValue({});
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

  // ── GET /api/events ───────────────────────────────────────────────────

  describe('GET /api/events', () => {
    it('無需 JWT，回傳活動列表與分頁 meta', async () => {
      const res = await request(app.getHttpServer()).get('/api/events');

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(Array.isArray((data as { items: unknown[] }).items)).toBe(true);
      expect((data as { meta: { total: number } }).meta.total).toBe(1);
    });

    it('關鍵字搜尋 → 200', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/events?keyword=運動',
      );
      expect(res.status).toBe(200);
    });

    it('標籤篩選 → 200', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/events?tags=運動',
      );
      expect(res.status).toBe(200);
    });
  });

  // ── GET /api/events/:id ───────────────────────────────────────────────

  describe('GET /api/events/:id', () => {
    it('無需 JWT，回傳活動詳情', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/events/${EVENT_UUID}`,
      );

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data.id).toBe(EVENT_UUID);
      expect(Array.isArray(data.tags)).toBe(true);
    });

    it('不存在的 id → 404', async () => {
      mockPrisma.eventRecord.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        `/api/events/${EVENT_UUID}`,
      );
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/events ──────────────────────────────────────────────────

  describe('POST /api/events', () => {
    it('建立活動 → 201', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '週末運動聚會',
          barName: '運動酒吧',
          location: '台北市信義區',
          startAt: '2025-06-01T10:00:00Z',
          endAt: '2025-06-01T14:00:00Z',
          tags: ['運動'],
        });

      expect(res.status).toBe(201);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data.id).toBe(EVENT_UUID);
    });

    it('缺少必填欄位 → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '週末運動聚會' });

      expect(res.status).toBe(400);
    });

    it('未帶 JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/events')
        .send({ name: '週末運動聚會' });

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/events/:id ─────────────────────────────────────────────

  describe('PATCH /api/events/:id', () => {
    it('更新活動名稱 → 200', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .patch(`/api/events/${EVENT_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '新名稱' });

      expect(res.status).toBe(200);
    });

    it('空 body → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .patch(`/api/events/${EVENT_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('不存在的活動 → 404', async () => {
      accessToken = await getToken();
      mockPrisma.eventRecord.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch(`/api/events/${EVENT_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '新名稱' });

      expect(res.status).toBe(404);
    });

    it('非主辦人也非 ADMIN → 403', async () => {
      accessToken = await getToken();
      // 活動的 hostUser 是 OTHER_UUID，不是目前登入的 USER_UUID
      mockPrisma.eventRecord.findUnique.mockResolvedValue({
        ...EVENT_RECORD,
        hostUser: OTHER_UUID,
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/events/${EVENT_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '新名稱' });

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/events/:id ────────────────────────────────────────────

  describe('DELETE /api/events/:id', () => {
    it('刪除活動 → 204', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });

    it('不存在的活動 → 404', async () => {
      accessToken = await getToken();
      mockPrisma.eventRecord.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/events/:id/join ─────────────────────────────────────────

  describe('POST /api/events/:id/join', () => {
    it('報名活動 → 201', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(201);
    });

    it('活動不存在 → 404', async () => {
      accessToken = await getToken();
      mockPrisma.eventRecord.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('已報名 → 409', async () => {
      accessToken = await getToken();
      mockPrisma.eventParticipation.findUnique.mockResolvedValue({
        id: 'part-001',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(409);
    });

    it('人數已滿 → 409', async () => {
      accessToken = await getToken();
      // maxPeople: 10，目前人數也是 10
      mockPrisma.eventParticipation.count.mockResolvedValue(10);

      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(409);
    });
  });

  // ── DELETE /api/events/:id/join ───────────────────────────────────────

  describe('DELETE /api/events/:id/join', () => {
    it('退出活動 → 204', async () => {
      accessToken = await getToken();
      mockPrisma.eventParticipation.findUnique.mockResolvedValue({
        id: 'part-001',
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });

    it('未報名 → 404', async () => {
      accessToken = await getToken();
      // beforeEach 預設 findUnique → null，代表尚未報名

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/events/:id/messages ──────────────────────────────────────

  describe('GET /api/events/:id/messages', () => {
    it('無需 JWT，回傳留言列表', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/events/${EVENT_UUID}/messages`,
      );

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(Array.isArray((data as { messages: unknown[] }).messages)).toBe(
        true,
      );
    });

    it('活動不存在 → 404', async () => {
      mockPrisma.eventRecord.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        `/api/events/${EVENT_UUID}/messages`,
      );
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/events/:id/messages ─────────────────────────────────────

  describe('POST /api/events/:id/messages', () => {
    it('發布留言 → 201', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '很期待這個活動！' });

      expect(res.status).toBe(201);
    });

    it('空 content → 400', async () => {
      accessToken = await getToken();

      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('未帶 JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/events/${EVENT_UUID}/messages`)
        .send({ content: '很期待這個活動！' });

      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /api/events/:id/messages/:messageId ────────────────────────

  describe('DELETE /api/events/:id/messages/:messageId', () => {
    it('刪除自己的留言 → 204', async () => {
      accessToken = await getToken();
      // MESSAGE_RECORD.userId === USER_UUID（本人）

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}/messages/${MESSAGE_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });

    it('留言不存在 → 404', async () => {
      accessToken = await getToken();
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}/messages/${MESSAGE_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('刪除他人留言 → 403', async () => {
      accessToken = await getToken();
      // userId 是 OTHER_UUID，不是目前登入的 USER_UUID
      mockPrisma.message.findUnique.mockResolvedValue({
        ...MESSAGE_RECORD,
        userId: OTHER_UUID,
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/events/${EVENT_UUID}/messages/${MESSAGE_UUID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/events/tags ──────────────────────────────────────────────

  describe('GET /api/events/tags', () => {
    it('無需 JWT，回傳標籤列表', async () => {
      const res = await request(app.getHttpServer()).get('/api/events/tags');

      expect(res.status).toBe(200);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(Array.isArray((data as { tags: unknown[] }).tags)).toBe(true);
    });
  });
});
