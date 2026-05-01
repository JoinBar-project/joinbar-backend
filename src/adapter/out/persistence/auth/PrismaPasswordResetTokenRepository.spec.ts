import { PrismaPasswordResetTokenRepository } from './PrismaPasswordResetTokenRepository';

const makeTokenRecord = (overrides = {}) => ({
  id: 'tok-1',
  userId: 'user-1',
  token: 'abc123',
  expiresAt: new Date('2099-01-01'),
  usedAt: null,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  passwordResetTokenRecord: {
    create: jest.fn().mockResolvedValue(undefined),
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  },
});

describe('PrismaPasswordResetTokenRepository', () => {
  let repo: PrismaPasswordResetTokenRepository;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaPasswordResetTokenRepository(prisma as any);
  });

  describe('createToken()', () => {
    it('呼叫 create 帶正確欄位', async () => {
      const expires = new Date('2099-01-01');
      await repo.createToken('user-1', 'tok', expires);
      expect(prisma.passwordResetTokenRecord.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', token: 'tok', expiresAt: expires },
      });
    });
  });

  describe('findByToken()', () => {
    it('找到時回傳 PasswordResetTokenData', async () => {
      prisma.passwordResetTokenRecord.findUnique.mockResolvedValue(
        makeTokenRecord(),
      );
      const result = await repo.findByToken('abc123');
      expect(result?.id).toBe('tok-1');
      expect(result?.usedAt).toBeNull();
    });

    it('找不到時回傳 null', async () => {
      prisma.passwordResetTokenRecord.findUnique.mockResolvedValue(null);
      expect(await repo.findByToken('nope')).toBeNull();
    });
  });

  describe('markUsed()', () => {
    it('呼叫 update 設定 usedAt', async () => {
      await repo.markUsed('tok-1');
      expect(prisma.passwordResetTokenRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tok-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
