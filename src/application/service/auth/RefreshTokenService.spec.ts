import { RefreshTokenService } from './RefreshTokenService';
import { FeatureFlagService } from '../FeatureFlagService';
import { InvalidRefreshTokenException } from '../../../domain/exception/InvalidRefreshTokenException';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    ACCESS_SECRET: 'access-secret-at-least-32-chars-long-xxx',
    REFRESH_SECRET: 'refresh-secret-at-least-32-chars-long-xx',
    ACCESS_TOKEN_EXPIRES_IN: 7200,
    REFRESH_TOKEN_EXPIRES_IN: 604800,
  }),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

const makeDeps = (overrides?: { authLogEnabled?: boolean }) => {
  const jwtService = {
    sign: jest.fn().mockReturnValue('new-access-token'),
    verify: jest.fn().mockReturnValue({ sub: USER_ID, type: 'refresh' }),
  };
  const tokenBlacklist = {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    addToBlacklist: jest.fn(),
  };
  const loadUserContext = {
    loadUserContext: jest.fn().mockResolvedValue({
      id: USER_ID,
      email: 'user@example.com',
      roleName: 'USER',
      status: true,
      lastPasswordChange: null,
    }),
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

  const service = new RefreshTokenService(
    jwtService as never,
    tokenBlacklist as never,
    loadUserContext as never,
    saveAuthLog as never,
    featureFlags,
  );
  return { service, jwtService, tokenBlacklist, loadUserContext, saveAuthLog };
};

describe('RefreshTokenService', () => {
  it('有效 refresh token → 回傳新 access token', async () => {
    const { service, jwtService } = makeDeps();
    const result = await service.execute({ refreshToken: 'valid-refresh' });
    expect(result.accessToken).toBe('new-access-token');
    expect(result.accessTokenExpiresIn).toBe(7200);
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: USER_ID, type: 'access' },
      expect.objectContaining({ expiresIn: 7200 }),
    );
  });

  it('在黑名單 → InvalidRefreshTokenException，不驗 JWT', async () => {
    const { service, tokenBlacklist, jwtService } = makeDeps();
    tokenBlacklist.isBlacklisted.mockResolvedValue(true);
    await expect(
      service.execute({ refreshToken: 'blacklisted' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('JWT 驗證失敗 → InvalidRefreshTokenException', async () => {
    const { service, jwtService } = makeDeps();
    jwtService.verify.mockImplementationOnce(() => {
      throw new Error('jwt malformed');
    });
    await expect(
      service.execute({ refreshToken: 'bad-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
  });

  it('token type=access → InvalidRefreshTokenException，不查 context', async () => {
    const { service, jwtService, loadUserContext } = makeDeps();
    jwtService.verify.mockReturnValue({ sub: USER_ID, type: 'access' });
    await expect(
      service.execute({ refreshToken: 'access-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(loadUserContext.loadUserContext).not.toHaveBeenCalled();
  });

  it('user context 不存在 → InvalidRefreshTokenException', async () => {
    const { service, loadUserContext } = makeDeps();
    loadUserContext.loadUserContext.mockResolvedValue(null);
    await expect(
      service.execute({ refreshToken: 'valid-but-user-gone' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
  });

  it('status=false → AccountDisabledException', async () => {
    const { service, loadUserContext } = makeDeps();
    loadUserContext.loadUserContext.mockResolvedValue({
      id: USER_ID,
      email: 'dis@example.com',
      roleName: 'USER',
      permissions: [],
      status: false,
      lastPasswordChange: null,
    });
    await expect(
      service.execute({ refreshToken: 'valid-token' }),
    ).rejects.toThrow(AccountDisabledException);
  });

  it('authLogEnabled=false → 不寫入 log', async () => {
    const { service, saveAuthLog } = makeDeps({ authLogEnabled: false });
    await service.execute({ refreshToken: 'valid' });
    expect(saveAuthLog.saveAuthLog).not.toHaveBeenCalled();
  });

  it('authLogEnabled=true → 寫入 REFRESH log', async () => {
    const { service, saveAuthLog } = makeDeps({ authLogEnabled: true });
    await service.execute({
      refreshToken: 'valid',
      ip: '1.2.3.4',
      userAgent: 'test',
    });
    expect(saveAuthLog.saveAuthLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        email: 'user@example.com',
        action: 'REFRESH',
        ipAddress: '1.2.3.4',
      }),
    );
  });

  it('saveAuthLog 失敗 → 主流程不中斷', async () => {
    const { service, saveAuthLog } = makeDeps({ authLogEnabled: true });
    saveAuthLog.saveAuthLog.mockRejectedValue(new Error('db down'));
    const result = await service.execute({ refreshToken: 'valid' });
    expect(result.accessToken).toBe('new-access-token');
  });
});
