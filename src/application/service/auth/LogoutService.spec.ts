import { JwtService } from '@nestjs/jwt';
import { LogoutService } from './LogoutService';
import { TokenBlacklistPort } from '../../port/out/auth/TokenBlacklistPort';
import { ClearUserContextPort } from '../../port/out/user/ClearUserContextPort';
import { SaveAuthLogPort } from '../../port/out/auth/SaveAuthLogPort';
import { FeatureFlagService } from '../FeatureFlagService';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    ACCESS_SECRET: 'access-secret-at-least-32-chars-long-xxx',
    REFRESH_SECRET: 'refresh-secret-at-least-32-chars-long-xx',
    ACCESS_TOKEN_EXPIRES_IN: 7200,
    REFRESH_TOKEN_EXPIRES_IN: 604800,
  }),
}));

const ACCESS_TOKEN_EXPIRES_IN = 7200;
const REFRESH_TOKEN_EXPIRES_IN = 604800;
const USER_ID = '00000000-0000-0000-0000-000000000001';

const makeDeps = (authLogEnabled = false) => {
  const jwtService = { verify: jest.fn() } as unknown as JwtService;
  const tokenBlacklist: jest.Mocked<TokenBlacklistPort> = {
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn(),
  };
  const clearUserContext: jest.Mocked<ClearUserContextPort> = {
    clearUserContext: jest.fn().mockResolvedValue(undefined),
  };
  const saveAuthLog: jest.Mocked<SaveAuthLogPort> = {
    saveAuthLog: jest.fn().mockResolvedValue(undefined),
  };
  const featureFlags = {
    isEnabled: jest.fn(
      (flag: string) => flag === 'authLogEnabled' && authLogEnabled,
    ),
    onModuleInit: jest.fn(),
  } as unknown as FeatureFlagService;

  const service = new LogoutService(
    jwtService,
    tokenBlacklist,
    clearUserContext,
    saveAuthLog,
    featureFlags,
  );
  return { service, jwtService, tokenBlacklist, clearUserContext, saveAuthLog };
};

describe('LogoutService', () => {
  it('access token 含有效 exp → 以剩餘秒數加入黑名單並清 context', async () => {
    const { service, jwtService, tokenBlacklist, clearUserContext } =
      makeDeps();
    const future = Math.floor(Date.now() / 1000) + 3600;
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: USER_ID,
      type: 'access',
      exp: future,
    });

    await service.execute({ accessToken: 'a-token' });

    expect(tokenBlacklist.addToBlacklist).toHaveBeenCalledWith(
      'a-token',
      expect.any(Number),
    );
    const ttl = tokenBlacklist.addToBlacklist.mock.calls[0][1] as number;
    expect(ttl).toBeGreaterThan(3595);
    expect(ttl).toBeLessThanOrEqual(3600);
    expect(clearUserContext.clearUserContext).toHaveBeenCalledWith(USER_ID);
  });

  it('access token 無 exp → 使用 ACCESS_TOKEN_EXPIRES_IN 作為 TTL', async () => {
    const { service, jwtService, tokenBlacklist } = makeDeps();
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: USER_ID,
      type: 'access',
    });

    await service.execute({ accessToken: 'no-exp' });

    expect(tokenBlacklist.addToBlacklist).toHaveBeenCalledWith(
      'no-exp',
      ACCESS_TOKEN_EXPIRES_IN,
    );
  });

  it('access token exp 已過期（ttl ≤ 0）→ 不加入黑名單但仍清 context', async () => {
    const { service, jwtService, tokenBlacklist, clearUserContext } =
      makeDeps();
    const past = Math.floor(Date.now() / 1000) - 10;
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: USER_ID,
      type: 'access',
      exp: past,
    });

    await service.execute({ accessToken: 'expired' });

    expect(tokenBlacklist.addToBlacklist).not.toHaveBeenCalled();
    expect(clearUserContext.clearUserContext).toHaveBeenCalledWith(USER_ID);
  });

  it('access token verify 失敗 → 不加入黑名單，不清 context', async () => {
    const { service, jwtService, tokenBlacklist, clearUserContext } =
      makeDeps();
    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    await service.execute({ accessToken: 'bad' });

    expect(tokenBlacklist.addToBlacklist).not.toHaveBeenCalled();
    expect(clearUserContext.clearUserContext).not.toHaveBeenCalled();
  });

  it('同時提供 access + refresh → 兩者都加入黑名單', async () => {
    const { service, jwtService, tokenBlacklist } = makeDeps();
    const future = Math.floor(Date.now() / 1000) + 3600;
    (jwtService.verify as jest.Mock)
      .mockReturnValueOnce({ sub: USER_ID, type: 'access', exp: future })
      .mockReturnValueOnce({ sub: USER_ID, type: 'refresh' });

    await service.execute({ accessToken: 'a-token', refreshToken: 'r-token' });

    expect(tokenBlacklist.addToBlacklist).toHaveBeenCalledTimes(2);
    expect(tokenBlacklist.addToBlacklist).toHaveBeenNthCalledWith(
      2,
      'r-token',
      REFRESH_TOKEN_EXPIRES_IN,
    );
  });

  it('refresh token verify 失敗 → 僅 access 處理，refresh 略過', async () => {
    const { service, jwtService, tokenBlacklist } = makeDeps();
    (jwtService.verify as jest.Mock)
      .mockReturnValueOnce({ sub: USER_ID, type: 'access' })
      .mockImplementationOnce(() => {
        throw new Error('refresh invalid');
      });

    await service.execute({ accessToken: 'a-token', refreshToken: 'bad' });

    expect(tokenBlacklist.addToBlacklist).toHaveBeenCalledTimes(1);
    expect(tokenBlacklist.addToBlacklist).toHaveBeenCalledWith(
      'a-token',
      expect.any(Number),
    );
  });

  it('authLogEnabled=true → 寫入 LOGOUT log', async () => {
    const { service, jwtService, saveAuthLog } = makeDeps(true);
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: USER_ID,
      type: 'access',
    });

    await service.execute({
      accessToken: 'a-token',
      email: 'u@e.com',
      ip: '1.2.3.4',
      userAgent: 'test',
    });

    expect(saveAuthLog.saveAuthLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        email: 'u@e.com',
        action: 'LOGOUT',
        ipAddress: '1.2.3.4',
      }),
    );
  });

  it('authLogEnabled=false → 不寫入 LOGOUT log', async () => {
    const { service, jwtService, saveAuthLog } = makeDeps(false);
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: USER_ID,
      type: 'access',
    });

    await service.execute({ accessToken: 'a-token' });

    expect(saveAuthLog.saveAuthLog).not.toHaveBeenCalled();
  });

  it('saveAuthLog 失敗 → 主流程不中斷', async () => {
    const { service, jwtService, saveAuthLog } = makeDeps(true);
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: USER_ID,
      type: 'access',
    });
    saveAuthLog.saveAuthLog.mockRejectedValue(new Error('log db down'));

    await expect(
      service.execute({ accessToken: 'a-token' }),
    ).resolves.toBeUndefined();
  });
});
