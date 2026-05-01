import { LineLoginService } from './LineLoginService';
import { FeatureFlagService } from '../FeatureFlagService';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';
import { User } from '../../../domain/model/User';
import { RoleName } from '../../../domain/value-object/Role';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    ACCESS_SECRET: 'access-secret-at-least-32-chars-long-xxx',
    REFRESH_SECRET: 'refresh-secret-at-least-32-chars-long-xx',
    ACCESS_TOKEN_EXPIRES_IN: 7200,
    REFRESH_TOKEN_EXPIRES_IN: 604800,
  }),
}));

const LINE_UID = 'U1234567890abcdef';
const USER_ID = '22222222-2222-4222-8222-222222222222';

const makeExistingUser = (active = true) =>
  User.reconstitute({
    id: USER_ID,
    email: null,
    username: 'line_user',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: active ? null : new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  });

const LINE_PROFILE = {
  uid: LINE_UID,
  displayName: 'Test User',
  pictureUrl: 'https://example.com/pic.jpg',
  email: 'line@example.com',
  statusMessage: null,
};

const makeDeps = (overrides?: { authLogEnabled?: boolean }) => {
  const lineOAuth = {
    exchangeCodeForProfile: jest.fn().mockResolvedValue(LINE_PROFILE),
  };
  const findUser = {
    findByProviderUid: jest.fn().mockResolvedValue(makeExistingUser()),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    existsByEmail: jest.fn(),
    findByEmailVerifyToken: jest.fn(),
  };
  const saveUser = {
    upsertLineProvider: jest.fn().mockResolvedValue(undefined),
    createWithLineProvider: jest.fn().mockResolvedValue(undefined),
    updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
    createWithEmailProvider: jest.fn(),
    updatePassword: jest.fn(),
    setEmailVerified: jest.fn(),
    updateLoginSecurity: jest.fn(),
  };
  const saveAuthLog = {
    saveAuthLog: jest.fn().mockResolvedValue(undefined),
  };
  const featureFlags = {
    isEnabled: jest.fn(
      (flag: string) =>
        flag === 'authLogEnabled' && (overrides?.authLogEnabled ?? false),
    ),
  } as unknown as FeatureFlagService;
  const jwtService = {
    sign: jest
      .fn()
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token'),
  };

  const service = new LineLoginService(
    lineOAuth as never,
    findUser as never,
    saveUser as never,
    saveAuthLog as never,
    jwtService as never,
    featureFlags,
  );

  return { service, lineOAuth, findUser, saveUser, saveAuthLog, jwtService };
};

describe('LineLoginService', () => {
  describe('既存ユーザー（LINE provider 登録済み）', () => {
    it('有效 LINE code → 回傳 access + refresh token', async () => {
      const { service, jwtService } = makeDeps();
      const result = await service.execute({
        code: 'valid-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.accessTokenExpiresIn).toBe(7200);
      expect(result.refreshTokenExpiresIn).toBe(604800);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('既存ユーザー → upsertLineProvider を呼ぶ', async () => {
      const { service, saveUser } = makeDeps();
      await service.execute({
        code: 'valid-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(saveUser.upsertLineProvider).toHaveBeenCalledWith(USER_ID, {
        lineUid: LINE_PROFILE.uid,
        displayName: LINE_PROFILE.displayName,
        pictureUrl: LINE_PROFILE.pictureUrl,
        email: LINE_PROFILE.email,
        statusMessage: LINE_PROFILE.statusMessage,
      });
      expect(saveUser.createWithLineProvider).not.toHaveBeenCalled();
    });

    it('帳號已停用 → AccountDisabledException', async () => {
      const { service, findUser } = makeDeps();
      findUser.findByProviderUid.mockResolvedValue(makeExistingUser(false));

      await expect(
        service.execute({
          code: 'valid-code',
          redirectUri: 'https://example.com/callback',
        }),
      ).rejects.toThrow(AccountDisabledException);
    });

    it('user info 回傳正確欄位', async () => {
      const { service } = makeDeps();
      const result = await service.execute({
        code: 'valid-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(result.user).toMatchObject({
        id: USER_ID,
        username: 'line_user',
        role: RoleName.USER,
      });
    });
  });

  describe('新規ユーザー（LINE provider 未登録）', () => {
    it('使用者不存在 → createWithLineProvider，回傳新 token', async () => {
      const { service, findUser, saveUser } = makeDeps();
      findUser.findByProviderUid.mockResolvedValue(null);

      const result = await service.execute({
        code: 'new-user-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(saveUser.createWithLineProvider).toHaveBeenCalledTimes(1);
      expect(saveUser.upsertLineProvider).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('new-access-token');
    });

    it('LINE profile に displayName なし → username は line_<uid> 形式', async () => {
      const { service, findUser, lineOAuth, saveUser } = makeDeps();
      findUser.findByProviderUid.mockResolvedValue(null);
      lineOAuth.exchangeCodeForProfile.mockResolvedValue({
        ...LINE_PROFILE,
        displayName: null,
      });

      await service.execute({
        code: 'no-name-code',
        redirectUri: 'https://example.com/callback',
      });

      const createdUser: User =
        saveUser.createWithLineProvider.mock.calls[0][0];
      expect(createdUser.username).toBe(`line_${LINE_UID}`);
    });
  });

  describe('auth log', () => {
    it('authLogEnabled=false → 不寫入 log', async () => {
      const { service, saveAuthLog } = makeDeps({ authLogEnabled: false });
      await service.execute({
        code: 'valid-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(saveAuthLog.saveAuthLog).not.toHaveBeenCalled();
    });

    it('authLogEnabled=true → 寫入 LINE_LOGIN log', async () => {
      const { service, saveAuthLog } = makeDeps({ authLogEnabled: true });
      await service.execute({
        code: 'valid-code',
        redirectUri: 'https://example.com/callback',
        ip: '1.2.3.4',
        userAgent: 'test-agent',
      });

      expect(saveAuthLog.saveAuthLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'LINE_LOGIN',
          ipAddress: '1.2.3.4',
        }),
      );
    });

    it('saveAuthLog 失敗 → 主流程不中斷', async () => {
      const { service, saveAuthLog } = makeDeps({ authLogEnabled: true });
      saveAuthLog.saveAuthLog.mockRejectedValue(new Error('db down'));

      const result = await service.execute({
        code: 'valid-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(result.accessToken).toBe('new-access-token');
    });
  });

  it('updateLastLoginAt は fire-and-forget（失敗しても主流程は中断しない）', async () => {
    const { service, saveUser } = makeDeps();
    saveUser.updateLastLoginAt.mockRejectedValue(new Error('db down'));

    const result = await service.execute({
      code: 'valid-code',
      redirectUri: 'https://example.com/callback',
    });

    expect(result.accessToken).toBe('new-access-token');
  });
});
