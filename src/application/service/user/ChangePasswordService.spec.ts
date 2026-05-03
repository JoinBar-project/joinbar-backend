import bcrypt from 'bcrypt';
import { ChangePasswordService } from './ChangePasswordService';
import { User } from '../../../domain/model/User';
import { RoleName } from '../../../domain/value-object/Role';
import { NoEmailProviderException } from '../../../domain/exception/NoEmailProviderException';
import { InvalidCurrentPasswordException } from '../../../domain/exception/InvalidCurrentPasswordException';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({ BCRYPT_ROUNDS: 1 }),
}));

const USER_ID = '00000000-0000-0000-0000-000000000001';
const OLD_PASSWORD = 'OldPass123!';
const NEW_PASSWORD = 'NewPass456@';
const OLD_HASH = bcrypt.hashSync(OLD_PASSWORD, 1);

const makeUser = (email: string | null = 'alice@example.com') =>
  User.reconstitute({
    id: USER_ID,
    email,
    username: 'alice',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: null,
    createdAt: new Date(),
  });

const mockFindUser = {
  findByEmailWithPassword: jest.fn(),
  findByProviderUid: jest.fn(),
  findById: jest.fn(),
  existsByEmail: jest.fn(),
  findByEmailVerifyToken: jest.fn(),
  findProfileById: jest.fn(),
};

const mockSaveUser = {
  createWithEmailProvider: jest.fn(),
  createWithLineProvider: jest.fn(),
  upsertLineProvider: jest.fn(),
  updatePassword: jest.fn(),
  setEmailVerified: jest.fn(),
  updateLoginSecurity: jest.fn(),
  updateLastLoginAt: jest.fn(),
};

const mockPasswordPolicy = { validateOrThrow: jest.fn() };

describe('ChangePasswordService', () => {
  let service: ChangePasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveUser.updatePassword.mockResolvedValue(undefined);
    service = new ChangePasswordService(
      mockFindUser,
      mockSaveUser,
      mockPasswordPolicy as never,
    );
  });

  it('成功更換密碼', async () => {
    mockFindUser.findById.mockResolvedValue(makeUser());
    mockFindUser.findByEmailWithPassword.mockResolvedValue({
      user: makeUser(),
      passwordHash: OLD_HASH,
      providerId: 'prov-1',
    });

    await service.execute({
      userId: USER_ID,
      oldPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(mockPasswordPolicy.validateOrThrow).toHaveBeenCalledWith(
      NEW_PASSWORD,
    );
    expect(mockSaveUser.updatePassword).toHaveBeenCalledWith(
      USER_ID,
      expect.any(String),
    );
  });

  it('舊密碼錯誤時拋出 InvalidCurrentPasswordException', async () => {
    mockFindUser.findById.mockResolvedValue(makeUser());
    mockFindUser.findByEmailWithPassword.mockResolvedValue({
      user: makeUser(),
      passwordHash: OLD_HASH,
      providerId: 'prov-1',
    });

    await expect(
      service.execute({
        userId: USER_ID,
        oldPassword: 'WrongPass!',
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toThrow(InvalidCurrentPasswordException);

    expect(mockSaveUser.updatePassword).not.toHaveBeenCalled();
  });

  it('純 LINE 使用者（無 email）拋出 NoEmailProviderException', async () => {
    mockFindUser.findById.mockResolvedValue(makeUser(null));

    await expect(
      service.execute({
        userId: USER_ID,
        oldPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toThrow(NoEmailProviderException);
  });

  it('有 email 但無 EMAIL provider 時拋出 NoEmailProviderException', async () => {
    mockFindUser.findById.mockResolvedValue(makeUser());
    mockFindUser.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: USER_ID,
        oldPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toThrow(NoEmailProviderException);
  });
});
