import { VerifyEmailService } from './VerifyEmailService';
import { InvalidEmailVerificationTokenException } from '../../../domain/exception/InvalidEmailVerificationTokenException';

const USER_ID = '55555555-5555-4555-8555-555555555555';
const VALID_TOKEN = 'b'.repeat(64);

const makeDeps = () => {
  const findUser = {
    findByEmailVerifyToken: jest.fn().mockResolvedValue({
      userId: USER_ID,
      verifyExpires: new Date(Date.now() + 60 * 60 * 1000),
    }),
    findByEmailWithPassword: jest.fn(),
    findByProviderUid: jest.fn(),
    findById: jest.fn(),
    existsByEmail: jest.fn(),
    findProfileById: jest.fn(),
  };
  const saveUser = {
    setEmailVerified: jest.fn().mockResolvedValue(undefined),
    createWithEmailProvider: jest.fn(),
    createWithLineProvider: jest.fn(),
    upsertLineProvider: jest.fn(),
    updatePassword: jest.fn(),
    updateLoginSecurity: jest.fn(),
    updateLastLoginAt: jest.fn(),
  };

  const service = new VerifyEmailService(findUser as never, saveUser as never);

  return { service, findUser, saveUser };
};

describe('VerifyEmailService', () => {
  it('有效 token → setEmailVerified を呼ぶ', async () => {
    const { service, saveUser } = makeDeps();

    await service.execute({ token: VALID_TOKEN });

    expect(saveUser.setEmailVerified).toHaveBeenCalledWith(USER_ID);
  });

  it('token 不存在 → InvalidEmailVerificationTokenException', async () => {
    const { service, findUser } = makeDeps();
    findUser.findByEmailVerifyToken.mockResolvedValue(null);

    await expect(service.execute({ token: 'no-such' })).rejects.toThrow(
      InvalidEmailVerificationTokenException,
    );
  });

  it('token 已過期 → InvalidEmailVerificationTokenException', async () => {
    const { service, findUser } = makeDeps();
    findUser.findByEmailVerifyToken.mockResolvedValue({
      userId: USER_ID,
      verifyExpires: new Date(Date.now() - 1000),
    });

    await expect(service.execute({ token: VALID_TOKEN })).rejects.toThrow(
      InvalidEmailVerificationTokenException,
    );
  });

  it('verifyExpires=null（無期限）→ 正常驗證通過', async () => {
    const { service, findUser, saveUser } = makeDeps();
    findUser.findByEmailVerifyToken.mockResolvedValue({
      userId: USER_ID,
      verifyExpires: null,
    });

    await service.execute({ token: VALID_TOKEN });

    expect(saveUser.setEmailVerified).toHaveBeenCalledWith(USER_ID);
  });
});
