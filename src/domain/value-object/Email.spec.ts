import { Email } from './Email';

describe('Email', () => {
  it('有效 email → 建立成功', () => {
    expect(() => Email.of('test@example.com')).not.toThrow();
  });

  it('toString() → 回傳原始值', () => {
    expect(Email.of('user@domain.org').toString()).toBe('user@domain.org');
  });

  it('無效 email → 拋出 Error，訊息不含原始值', () => {
    expect(() => Email.of('not-an-email')).toThrow('Invalid email format');
    expect(() => Email.of('not-an-email')).not.toThrow('not-an-email');
  });

  it('空字串 → 拋出 Error', () => {
    expect(() => Email.of('')).toThrow('Invalid email format');
  });

  it('equals() → 相同 email 回傳 true', () => {
    expect(Email.of('a@b.com').equals(Email.of('a@b.com'))).toBe(true);
  });

  it('equals() → 不同 email 回傳 false', () => {
    expect(Email.of('a@b.com').equals(Email.of('c@d.com'))).toBe(false);
  });
});
