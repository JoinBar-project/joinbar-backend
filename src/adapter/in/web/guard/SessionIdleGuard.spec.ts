import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionIdleGuard } from './SessionIdleGuard';
import { FeatureFlagService } from '../../../../application/service/FeatureFlagService';
import { SessionActivityPort } from '../../../../application/port/out/auth/SessionActivityPort';

jest.mock('../../../../infrastructure/validate-env', () => ({
  getEnv: () => ({ APPLICATION_SESSION_IDLE_TIMEOUT: 120 }),
}));

const makeContext = (user?: { sub: string }): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const makeFeatureFlags = (enabled: boolean) =>
  ({
    isEnabled: jest.fn().mockReturnValue(enabled),
  }) as unknown as FeatureFlagService;

const makeSessionActivity = (
  overrides: Partial<SessionActivityPort> = {},
): jest.Mocked<SessionActivityPort> =>
  ({
    isActive: jest.fn().mockResolvedValue(true),
    touchActivity: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as jest.Mocked<SessionActivityPort>;

describe('SessionIdleGuard', () => {
  it('feature flag 關閉 → 直接放行，不查 session', async () => {
    const sessionActivity = makeSessionActivity();
    const guard = new SessionIdleGuard(
      makeFeatureFlags(false),
      sessionActivity,
    );

    const result = await guard.canActivate(makeContext({ sub: 'u1' }));

    expect(result).toBe(true);
    expect(sessionActivity.isActive).not.toHaveBeenCalled();
  });

  it('未認證路由（request.user 不存在）→ 放行', async () => {
    const sessionActivity = makeSessionActivity();
    const guard = new SessionIdleGuard(makeFeatureFlags(true), sessionActivity);

    const result = await guard.canActivate(makeContext(undefined));

    expect(result).toBe(true);
    expect(sessionActivity.isActive).not.toHaveBeenCalled();
  });

  it('session 已逾時 → UnauthorizedException', async () => {
    const sessionActivity = makeSessionActivity({
      isActive: jest.fn().mockResolvedValue(false),
    });
    const guard = new SessionIdleGuard(makeFeatureFlags(true), sessionActivity);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionActivity.touchActivity).not.toHaveBeenCalled();
  });

  it('session 仍活躍 → 放行並更新最後活動時間', async () => {
    const sessionActivity = makeSessionActivity();
    const guard = new SessionIdleGuard(makeFeatureFlags(true), sessionActivity);

    const result = await guard.canActivate(makeContext({ sub: 'u1' }));

    expect(result).toBe(true);
    expect(sessionActivity.touchActivity).toHaveBeenCalledWith('u1', 120);
  });
});
