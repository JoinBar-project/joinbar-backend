import { BadRequestException } from '@nestjs/common';
import { PasswordPolicyService } from './PasswordPolicyService';

jest.mock('../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    APPLICATION_PASSWORD_MIN_LENGTH: 8,
    APPLICATION_PASSWORD_MAX_LENGTH: 32,
    APPLICATION_PASSWORD_COMPLEXITY: 2,
  }),
}));

describe('PasswordPolicyService', () => {
  let service: PasswordPolicyService;

  beforeEach(() => {
    service = new PasswordPolicyService();
    service.onModuleInit();
  });

  it('符合策略（複雜度 2）→ 不拋例外', () => {
    expect(() => service.validateOrThrow('Abcdef1!')).not.toThrow();
  });

  it('缺少特殊符號 → BadRequestException', () => {
    expect(() => service.validateOrThrow('Abcdefg1')).toThrow(
      BadRequestException,
    );
  });

  it('缺少大寫 → BadRequestException', () => {
    expect(() => service.validateOrThrow('abcdef1!')).toThrow(
      BadRequestException,
    );
  });

  it('太短 → BadRequestException', () => {
    expect(() => service.validateOrThrow('Ab1!')).toThrow(BadRequestException);
  });

  it('minLength / maxLength 屬性', () => {
    expect(service.minLength).toBe(8);
    expect(service.maxLength).toBe(32);
  });
});
