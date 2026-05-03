import { BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ConfirmPasswordResetService } from './ConfirmPasswordResetService';
import { FeatureFlagService } from '../FeatureFlagService';
import { PasswordPolicyService } from '../PasswordPolicyService';
import { InvalidPasswordResetTokenException } from '../../../domain/exception/InvalidPasswordResetTokenException';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';
import { User } from '../../../domain/model/User';
import { RoleName } from '../../../domain/value-object/Role';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    BCRYPT_ROUNDS: 1,
  }),
}));

const USER_ID = '44444444-4444-4444-8444-444444444444';
const TOKEN_ID = 'token-row-id-1';
const VALID_TOKEN = 'a'.repeat(64);
const NEW_PASSWORD = 'NewValidPass1';

const makeUser = (active = true) =>
  User.reconstitute({
    id: USER_ID,
    email: 'user@example.com',
    username: 'testuser',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: active ? null : new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  });

const makeTokenData = (overrides?: {
  usedAt?: Date | null;
  expiresAt?: Date;
}) => ({
  id: TOKEN_ID,
  userId: USER_ID,
  token: VALID_TOKEN,
  expiresAt: overrides?.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
  usedAt: overrides?.usedAt ?? null,
  createdAt: new Date(),
});

const makeDeps = (overrides?: {
  authLogEnabled?: boolean;
  logoutAfterPasswordResetEnabled?: boolean;
}) => {
  const findUser = {
    findById: jest.fn().mockResolvedValue(makeUser()),
    findByEmailWithPassword: jest.fn(),
    findByProviderUid: jest.fn(),
    existsByEmail: jest.fn(),
    findByEmailVerifyToken: jest.fn(),
  findProfileById: jest.fn(),
  };
  const saveUser = {
    updatePassword: jest.fn().mockResolvedValue(undefined),
    createWithEmailProvider: jest.fn(),
    createWithLineProvider: jest.fn(),
    upsertLineProvider: jest.fn(),
    setEmailVerified: jest.fn(),
    updateLoginSecurity: jest.fn(),
    updateLastLoginAt: jest.fn(),
  };
  const resetToken = {
    findByToken: jest.fn().mockResolvedValue(makeTokenData()),
    markUsed: jest.fn().mockResolvedValue(undefined),
    createToken: jest.fn(),
  };
  const clearUserContext = {
    clearUserContext: jest.fn().mockResolvedValue(undefined),
  };
  const saveAuthLog = {
    saveAuthLog: jest.fn().mockResolvedValue(undefined),
  };
  const passwordPolicy = {
    validateOrThrow: jest.fn(),
    onModuleInit: jest.fn(),
    minLength: 8,
    maxLength: 32,
  } as unknown as PasswordPolicyService;
  const featureFlags = {
    isEnabled: jest.fn((flag: string) => {
      if (flag === 'authLogEnabled') return overrides?.authLogEnabled ?? false;
      if (flag === 'logoutAfterPasswordResetEnabled')
        return overrides?.logoutAfterPasswordResetEnabled ?? true;
      return false;
    }),
  } as unknown as FeatureFlagService;

  const service = new ConfirmPasswordResetService(
    findUser as never,
    saveUser as never,
    resetToken as never,
    clearUserContext as never,
    saveAuthLog as never,
    passwordPolicy,
    featureFlags,
  );

  return {
    service,
    findUser,
    saveUser,
    resetToken,
    clearUserContext,
    saveAuthLog,
    passwordPolicy,
    featureFlags,
  };
};

describe('ConfirmPasswordResetService', () => {
  beforeEach(() => {
    jest
      .spyOn(bcrypt, 'hash')
      .mockResolvedValue('new-hashed-password' as never);
  });

  describe('成功路徑', () => {
    it('有效 token → 更新密碼、作廢 token、清除 context', async () => {
      const { service, saveUser, resetToken, clearUserContext } = makeDeps();

      await service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD });

      expect(saveUser.updatePassword).toHaveBeenCalledWith(
        USER_ID,
        'new-hashed-password',
      );
      expect(resetToken.markUsed).toHaveBeenCalledWith(TOKEN_ID);
      expect(clearUserContext.clearUserContext).toHaveBeenCalledWith(USER_ID);
    });

    it('logoutAfterPasswordResetEnabled=true → clearUserContext を呼ぶ', async () => {
      const { service, clearUserContext } = makeDeps({
        logoutAfterPasswordResetEnabled: true,
      });

      await service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD });

      expect(clearUserContext.clearUserContext).toHaveBeenCalledWith(USER_ID);
    });

    it('logoutAfterPasswordResetEnabled=false → clearUserContext を呼ばない', async () => {
      const { service, clearUserContext } = makeDeps({
        logoutAfterPasswordResetEnabled: false,
      });

      await service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD });

      expect(clearUserContext.clearUserContext).not.toHaveBeenCalled();
    });
  });

  describe('token 驗證失敗', () => {
    it('token 不存在 → InvalidPasswordResetTokenException', async () => {
      const { service, resetToken } = makeDeps();
      resetToken.findByToken.mockResolvedValue(null);

      await expect(
        service.execute({ token: 'no-such', newPassword: NEW_PASSWORD }),
      ).rejects.toThrow(InvalidPasswordResetTokenException);
    });

    it('token 已使用 → InvalidPasswordResetTokenException', async () => {
      const { service, resetToken } = makeDeps();
      resetToken.findByToken.mockResolvedValue(
        makeTokenData({ usedAt: new Date() }),
      );

      await expect(
        service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD }),
      ).rejects.toThrow(InvalidPasswordResetTokenException);
    });

    it('token 已過期 → InvalidPasswordResetTokenException', async () => {
      const { service, resetToken } = makeDeps();
      resetToken.findByToken.mockResolvedValue(
        makeTokenData({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD }),
      ).rejects.toThrow(InvalidPasswordResetTokenException);
    });
  });

  it('帳號已停用 → AccountDisabledException', async () => {
    const { service, findUser } = makeDeps();
    findUser.findById.mockResolvedValue(makeUser(false));

    await expect(
      service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD }),
    ).rejects.toThrow(AccountDisabledException);
  });

  it('密碼不符合策略 → BadRequestException（PasswordPolicyService 拋出）', async () => {
    const { service, passwordPolicy } = makeDeps();
    (passwordPolicy.validateOrThrow as jest.Mock).mockImplementation(() => {
      throw new BadRequestException('密碼不符合安全策略');
    });

    await expect(
      service.execute({ token: VALID_TOKEN, newPassword: 'weak' }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('auth log', () => {
    it('authLogEnabled=true → 寫入 PASSWORD_RESET log', async () => {
      const { service, saveAuthLog } = makeDeps({ authLogEnabled: true });

      await service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD });

      expect(saveAuthLog.saveAuthLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'PASSWORD_RESET',
        }),
      );
    });

    it('authLogEnabled=false → 不寫入 log', async () => {
      const { service, saveAuthLog } = makeDeps({ authLogEnabled: false });

      await service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD });

      expect(saveAuthLog.saveAuthLog).not.toHaveBeenCalled();
    });

    it('saveAuthLog 失敗 → 主流程不中斷', async () => {
      const { service, saveAuthLog } = makeDeps({ authLogEnabled: true });
      saveAuthLog.saveAuthLog.mockRejectedValue(new Error('db down'));

      await expect(
        service.execute({ token: VALID_TOKEN, newPassword: NEW_PASSWORD }),
      ).resolves.toBeUndefined();
    });
  });
});
