import { PrismaUserRepository } from './PrismaUserRepository';
import { RoleName } from '../../../../domain/value-object/Role';

const makeUserRecord = (overrides = {}) => ({
  id: 'user-1',
  email: 'a@b.com',
  username: 'alice',
  nickname: null,
  role: 'USER',
  failedLoginCount: 0,
  lockedAt: null,
  lastPasswordChange: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const makeProvider = (overrides = {}) => ({
  id: 'prov-1',
  userId: 'user-1',
  provider: 'EMAIL',
  providerId: null,
  email: 'a@b.com',
  displayName: null,
  pictureUrl: null,
  lineStatusMessage: null,
  password: 'hashed',
  isVerified: true,
  verifyToken: null,
  verifyExpires: null,
  lastVerifyEmailSent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: makeUserRecord(),
  ...overrides,
});

const makePrisma = () => ({
  userRecord: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userAuthProvider: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn().mockResolvedValue(undefined),
});

describe('PrismaUserRepository', () => {
  let repo: PrismaUserRepository;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaUserRepository(prisma as any);
  });

  describe('findByEmailWithPassword()', () => {
    it('EMAIL provider 存在 → 回傳 UserWithPassword', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue(makeProvider());
      const result = await repo.findByEmailWithPassword('a@b.com');
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe('user-1');
      expect(result!.passwordHash).toBe('hashed');
      expect(result!.providerId).toBe('prov-1');
    });

    it('provider 不存在 → 回傳 null', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue(null);
      expect(await repo.findByEmailWithPassword('x@b.com')).toBeNull();
    });

    it('provider 無 password → 回傳 null', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue(
        makeProvider({ password: null }),
      );
      expect(await repo.findByEmailWithPassword('a@b.com')).toBeNull();
    });
  });

  describe('findByProviderUid()', () => {
    it('LINE provider 存在 → 回傳 User', async () => {
      prisma.userAuthProvider.findUnique.mockResolvedValue(makeProvider());
      const user = await repo.findByProviderUid('LINE', 'line-uid-1');
      expect(user?.id).toBe('user-1');
    });

    it('不存在 → 回傳 null', async () => {
      prisma.userAuthProvider.findUnique.mockResolvedValue(null);
      expect(await repo.findByProviderUid('LINE', 'x')).toBeNull();
    });
  });

  describe('findById()', () => {
    it('存在 → 回傳 User', async () => {
      prisma.userRecord.findUnique.mockResolvedValue(makeUserRecord());
      const user = await repo.findById('user-1');
      expect(user?.role).toBe(RoleName.USER);
    });

    it('不存在 → 回傳 null', async () => {
      prisma.userRecord.findUnique.mockResolvedValue(null);
      expect(await repo.findById('x')).toBeNull();
    });
  });

  describe('existsByEmail()', () => {
    it('有 EMAIL provider → true', async () => {
      prisma.userAuthProvider.count.mockResolvedValue(1);
      expect(await repo.existsByEmail('a@b.com')).toBe(true);
    });

    it('無 EMAIL provider → false', async () => {
      prisma.userAuthProvider.count.mockResolvedValue(0);
      expect(await repo.existsByEmail('new@b.com')).toBe(false);
    });
  });

  describe('loadUserContext()', () => {
    it('存在 → 回傳 UserContextData，permissions 為空陣列', async () => {
      prisma.userRecord.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        role: 'ADMIN',
        deletedAt: null,
        lastPasswordChange: null,
      });
      const ctx = await repo.loadUserContext('user-1');
      expect(ctx?.roleName).toBe('ADMIN');
      expect(ctx?.permissions).toEqual([]);
      expect(ctx?.status).toBe(true);
    });

    it('deletedAt 有值 → status false', async () => {
      prisma.userRecord.findUnique.mockResolvedValue({
        id: 'user-1',
        email: null,
        role: 'USER',
        deletedAt: new Date(),
        lastPasswordChange: null,
      });
      const ctx = await repo.loadUserContext('user-1');
      expect(ctx?.status).toBe(false);
    });

    it('不存在 → 回傳 null', async () => {
      prisma.userRecord.findUnique.mockResolvedValue(null);
      expect(await repo.loadUserContext('x')).toBeNull();
    });
  });

  describe('updateLoginSecurity()', () => {
    it('呼叫 userRecord.update 帶正確參數', async () => {
      prisma.userRecord.update.mockResolvedValue({});
      const locked = new Date();
      await repo.updateLoginSecurity('user-1', 3, locked);
      expect(prisma.userRecord.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginCount: 3, lockedAt: locked },
      });
    });
  });
});
