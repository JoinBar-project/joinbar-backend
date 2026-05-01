import { User } from './User';
import { Email } from '../value-object/Email';
import { RoleName } from '../value-object/Role';

const makeUser = (
  overrides: Partial<Parameters<typeof User.reconstitute>[0]> = {},
) =>
  User.reconstitute({
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  });

describe('User.create()', () => {
  it('正常建立使用者', () => {
    const user = User.create({
      id: 'u1',
      email: Email.of('a@b.com'),
      username: 'alice',
    });
    expect(user.id).toBe('u1');
    expect(user.username).toBe('alice');
    expect(user.role).toBe(RoleName.USER);
    expect(user.isActive()).toBe(true);
    expect(user.isLocked()).toBe(false);
    expect(user.failedLoginCount).toBe(0);
  });

  it('username 為空白時拋出錯誤', () => {
    expect(() =>
      User.create({ id: 'u1', email: null, username: '  ' }),
    ).toThrow('username 不可為空白');
  });

  it('LINE 使用者可建立無 email 的帳號', () => {
    const user = User.create({ id: 'u2', email: null, username: 'lineuser' });
    expect(user.email).toBeNull();
  });
});

describe('User.reconstitute()', () => {
  it('從持久層正確重建', () => {
    const user = makeUser({ email: 'hello@test.com', role: RoleName.ADMIN });
    expect(user.email?.toString()).toBe('hello@test.com');
    expect(user.role).toBe(RoleName.ADMIN);
  });

  it('email 為 null 時重建成功', () => {
    const user = makeUser({ email: null });
    expect(user.email).toBeNull();
  });
});

describe('isActive()', () => {
  it('deletedAt 為 null → active', () => {
    expect(makeUser().isActive()).toBe(true);
  });

  it('deletedAt 有值 → 非 active', () => {
    expect(makeUser({ deletedAt: new Date() }).isActive()).toBe(false);
  });
});

describe('帳號鎖定邏輯', () => {
  it('isLocked() 初始為 false', () => {
    expect(makeUser().isLocked()).toBe(false);
  });

  it('lock() 後 isLocked() 為 true', () => {
    const user = makeUser();
    user.lock();
    expect(user.isLocked()).toBe(true);
    expect(user.lockedAt).not.toBeNull();
  });

  it('incrementFailedLogin() 累加計數', () => {
    const user = makeUser();
    user.incrementFailedLogin();
    user.incrementFailedLogin();
    expect(user.failedLoginCount).toBe(2);
  });

  it('resetFailedLogin() 重置為 0', () => {
    const user = makeUser({ failedLoginCount: 3 });
    user.resetFailedLogin();
    expect(user.failedLoginCount).toBe(0);
  });
});

describe('isPasswordExpired()', () => {
  it('lastPasswordChange 為 null → 回傳 false', () => {
    expect(makeUser().isPasswordExpired(6)).toBe(false);
  });

  it('最後修改時間超過期限 → 回傳 true', () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 7);
    expect(makeUser({ lastPasswordChange: oldDate }).isPasswordExpired(6)).toBe(
      true,
    );
  });

  it('最後修改時間未超過期限 → 回傳 false', () => {
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 3);
    expect(
      makeUser({ lastPasswordChange: recentDate }).isPasswordExpired(6),
    ).toBe(false);
  });
});
