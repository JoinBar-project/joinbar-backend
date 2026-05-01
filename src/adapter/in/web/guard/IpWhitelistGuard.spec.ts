import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IpWhitelistGuard } from './IpWhitelistGuard';
import { FeatureFlagService } from '../../../../application/service/FeatureFlagService';
import { IpListPort } from '../../../../application/port/out/security/IpListPort';

const makeContext = (ip: string | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  }) as unknown as ExecutionContext;

const makeFeatureFlags = (enabled: boolean) =>
  ({
    isEnabled: jest.fn().mockReturnValue(enabled),
  }) as unknown as FeatureFlagService;

const makeIpList = (overrides: Partial<IpListPort> = {}) =>
  ({
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isWhitelisted: jest.fn().mockResolvedValue(true),
    addToWhitelist: jest.fn(),
    addToBlacklist: jest.fn(),
    removeFromWhitelist: jest.fn(),
    removeFromBlacklist: jest.fn(),
    listWhitelist: jest.fn(),
    listBlacklist: jest.fn(),
    ...overrides,
  }) as jest.Mocked<IpListPort>;

describe('IpWhitelistGuard', () => {
  it('feature flag 關閉 → 直接放行，不查 IP list', async () => {
    const ipList = makeIpList();
    const guard = new IpWhitelistGuard(makeFeatureFlags(false), ipList);

    const result = await guard.canActivate(makeContext('1.2.3.4'));

    expect(result).toBe(true);
    expect(ipList.isWhitelisted).not.toHaveBeenCalled();
  });

  it('feature flag 開啟、IP 在白名單 → 放行', async () => {
    const ipList = makeIpList();
    const guard = new IpWhitelistGuard(makeFeatureFlags(true), ipList);

    const result = await guard.canActivate(makeContext('1.2.3.4'));

    expect(result).toBe(true);
  });

  it('feature flag 開啟、IP 不在白名單 → ForbiddenException', async () => {
    const ipList = makeIpList({
      isWhitelisted: jest.fn().mockResolvedValue(false),
    });
    const guard = new IpWhitelistGuard(makeFeatureFlags(true), ipList);

    await expect(guard.canActivate(makeContext('1.2.3.4'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('feature flag 開啟但 request.ip 不存在 → ForbiddenException', async () => {
    const ipList = makeIpList();
    const guard = new IpWhitelistGuard(makeFeatureFlags(true), ipList);

    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
