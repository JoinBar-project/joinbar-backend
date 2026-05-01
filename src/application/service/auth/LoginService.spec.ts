import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { LoginService } from './LoginService';
import { User } from '../../../domain/model/User';
import { RoleName } from '../../../domain/value-object/Role';
import { FeatureFlagService } from '../FeatureFlagService';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    ACCESS_SECRET: 'access-secret-at-least-32-chars-long-xxx',
    REFRESH_SECRET: 'refresh-secret-at-least-32-chars-long-xx',
    ACCESS_TOKEN_EXPIRES_IN: 7200,
    REFRESH_TOKEN_EXPIRES_IN: 604800,
    APPLICATION_ACCOUNT_LOCK_THRESHOLD: 3,
    APPLICATION_IP_BLOCK_THRESHOLD: 5,
    APPLICATION_SESSION_IDLE_TIMEOUT: 120,
  }),
}));

const USER_ID = '00000000-0000-0000-0000-000000000001';

const makeUser = (deletedAt: Date | null = null) =>
  User.reconstitute({
    id: USER_ID,
    email: 'user@example.com',
    username: 'alice',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt,
    createdAt: new Date(),
  });

const makeFound = (user = makeUser()) => ({
  user,
  passwordHash: 'hashed',
  providerId: 'prov-1',
});

const mockFindUser = {
  findByEmailWithPassword: jest.fn(),
  findByProviderUid: jest.fn(),
  findById: jest.fn(),
  existsByEmail: jest.fn(),
  findByEmailVerifyToken: jest.fn(),
};

const mockSaveUser = {
  createWithEmailProvider: jest.fn(),
  createWithLineProvider: jest.fn(),
  upsertLineProvider: jest.fn(),
  updatePassword: jest.fn(),
  setEmailVerified: jest.fn(),
  updateLoginSecurity: jest.fn(),
  updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
};

const mockSaveAuthLog = { saveAuthLog: jest.fn().mockResolvedValue(undefined) };
const mockAccountLock = {
  recordFailedLogin: jest.fn().mockResolvedValue(1),
  resetFailedLogin: jest.fn().mockResolvedValue(undefined),
  isLocked: jest.fn().mockResolvedValue(false),
  lockAccount: jest.fn().mockResolvedValue(undefined),
  unlockAccount: jest.fn().mockResolvedValue(undefined),
};
const mockIpBlock = {
  recordFailedIpAttempt: jest.fn().mockResolvedValue(1),
  resetIpAttempts: jest.fn().mockResolvedValue(undefined),
};
const mockIpList = {
  isWhitelisted: jest.fn(),
  isBlacklisted: jest.fn(),
  addToWhitelist: jest.fn(),
  addToBlacklist: jest.fn().mockResolvedValue(undefined),
  removeFromWhitelist: jest.fn(),
  removeFromBlacklist: jest.fn(),
  listWhitelist: jest.fn(),
  listBlacklist: jest.fn(),
};
const mockRecaptcha = { verify: jest.fn().mockResolvedValue(true) };
const mockSessionActivity = {
  touchActivity: jest.fn().mockResolvedValue(undefined),
  isActive: jest.fn().mockResolvedValue(true),
};
const mockFeatureFlags = {
  isEnabled: jest.fn().mockReturnValue(false),
  onModuleInit: jest.fn(),
};
const mockJwt = {
  sign: jest
    .fn()
    .mockImplementation((payload: { type: string }) =>
      payload.type === 'access' ? 'access-token' : 'refresh-token',
    ),
} as unknown as JwtService;

describe('LoginService', () => {
  let service: LoginService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureFlags.isEnabled.mockReturnValue(false);
    mockSaveUser.updateLastLoginAt.mockResolvedValue(undefined);
    service = new LoginService(
      mockFindUser,
      mockSaveUser,
      mockSaveAuthLog,
      mockAccountLock,
      mockIpBlock,
      mockIpList,
      mockRecaptcha,
      mockSessionActivity,
      mockJwt,
      mockFeatureFlags as unknown as FeatureFlagService,
    );
  });

  it('正確憑證 → 回傳雙 token 與 user 資訊', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const result = await service.execute({
      email: 'user@example.com',
      password: 'correct',
    });

    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
      user: { id: USER_ID, username: 'alice', role: RoleName.USER },
    });
  });

  it('access / refresh token 分別使用獨立 secret 簽發', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    await service.execute({ email: 'user@example.com', password: 'correct' });

    expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    expect(mockJwt.sign).toHaveBeenNthCalledWith(
      1,
      { sub: USER_ID, type: 'access' },
      expect.objectContaining({ expiresIn: 7200 }),
    );
    expect(mockJwt.sign).toHaveBeenNthCalledWith(
      2,
      { sub: USER_ID, type: 'refresh' },
      expect.objectContaining({ expiresIn: 604800 }),
    );
  });

  it('登入成功後 fire-and-forget 呼叫 updateLastLoginAt', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    await service.execute({ email: 'user@example.com', password: 'correct' });

    expect(mockSaveUser.updateLastLoginAt).toHaveBeenCalledWith(USER_ID);
  });

  it('updateLastLoginAt 失敗 → 登入仍成功（fire-and-forget）', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    mockSaveUser.updateLastLoginAt.mockRejectedValue(new Error('db down'));

    const result = await service.execute({
      email: 'user@example.com',
      password: 'correct',
    });

    expect(result.accessToken).toBe('access-token');
  });

  it('帳號已刪除（deletedAt 不為 null）→ AccountDisabledException', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(
      makeFound(makeUser(new Date())),
    );
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    await expect(
      service.execute({ email: 'user@example.com', password: 'correct' }),
    ).rejects.toThrow(AccountDisabledException);
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  it('使用者不存在 → UnauthorizedException', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.execute({ email: 'no@body.com', password: 'any' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('密碼錯誤 → UnauthorizedException', async () => {
    mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.execute({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe('accountLockEnabled=true', () => {
    beforeEach(() => {
      mockFeatureFlags.isEnabled.mockImplementation(
        (flag: string) => flag === 'accountLockEnabled',
      );
      // clearAllMocks 不重置 mockResolvedValue，需在此明確還原預設值
      mockAccountLock.isLocked.mockResolvedValue(false);
      mockAccountLock.recordFailedLogin.mockResolvedValue(1);
    });

    it('帳號已鎖定 → ForbiddenException，不進行密碼驗證', async () => {
      mockAccountLock.isLocked.mockResolvedValue(true);

      await expect(
        service.execute({ email: 'user@example.com', password: 'any' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockFindUser.findByEmailWithPassword).not.toHaveBeenCalled();
    });

    it('密碼錯誤且達到鎖定門檻 → 呼叫 lockAccount', async () => {
      mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockAccountLock.recordFailedLogin.mockResolvedValue(3);

      await expect(
        service.execute({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAccountLock.lockAccount).toHaveBeenCalledWith(
        'user@example.com',
      );
    });

    it('登入成功後重置失敗計數', async () => {
      mockFindUser.findByEmailWithPassword.mockResolvedValue(makeFound());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.execute({ email: 'user@example.com', password: 'correct' });

      expect(mockAccountLock.resetFailedLogin).toHaveBeenCalledWith(
        'user@example.com',
      );
    });
  });

  describe('googleRecaptchaEnabled=true', () => {
    beforeEach(() => {
      mockFeatureFlags.isEnabled.mockImplementation(
        (flag: string) => flag === 'googleRecaptchaEnabled',
      );
    });

    it('未提供 recaptchaToken → UnauthorizedException', async () => {
      await expect(
        service.execute({ email: 'a@b.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockFindUser.findByEmailWithPassword).not.toHaveBeenCalled();
    });

    it('reCAPTCHA 驗證失敗 → UnauthorizedException', async () => {
      mockRecaptcha.verify.mockResolvedValue(false);

      await expect(
        service.execute({
          email: 'a@b.com',
          password: 'x',
          recaptchaToken: 'bad-token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
