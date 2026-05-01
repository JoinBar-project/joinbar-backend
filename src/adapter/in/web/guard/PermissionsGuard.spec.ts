import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './PermissionsGuard';

const makeContext = (permissions: string[]): ExecutionContext => {
  const request = { user: { permissions } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new PermissionsGuard(reflector);
  });

  it('無 @Permissions 裝飾（undefined）→ 放行', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext([]))).toBe(true);
  });

  it('空 permissions 陣列 → 放行', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext([]))).toBe(true);
  });

  it('使用者有所需單一權限 → 放行', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.view']);
    expect(guard.canActivate(makeContext(['user.view', 'user.edit']))).toBe(
      true,
    );
  });

  it('使用者有所需多個權限 → 放行', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.view', 'user.edit']);
    expect(guard.canActivate(makeContext(['user.view', 'user.edit']))).toBe(
      true,
    );
  });

  it('使用者缺少所需權限 → ForbiddenException', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.edit']);
    expect(() => guard.canActivate(makeContext(['user.view']))).toThrow(
      ForbiddenException,
    );
  });

  it('使用者缺少部分所需權限 → ForbiddenException', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.view', 'user.edit']);
    expect(() => guard.canActivate(makeContext(['user.view']))).toThrow(
      ForbiddenException,
    );
  });

  it('使用者無任何權限 → ForbiddenException', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.view']);
    expect(() => guard.canActivate(makeContext([]))).toThrow(
      ForbiddenException,
    );
  });
});
