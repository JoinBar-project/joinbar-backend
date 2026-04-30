import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PasswordPolicy } from '../../domain/value-object/PasswordPolicy';
import { getEnv } from '../../infrastructure/validate-env';

/**
 * 密碼策略服務：根據環境變數套用密碼複雜度規則。
 * 驗證失敗時拋出 BadRequestException。
 */
@Injectable()
export class PasswordPolicyService implements OnModuleInit {
  private policy!: PasswordPolicy;
  private _minLength!: number;
  private _maxLength!: number;

  onModuleInit(): void {
    const env = getEnv();
    this._minLength = env.APPLICATION_PASSWORD_MIN_LENGTH;
    this._maxLength = env.APPLICATION_PASSWORD_MAX_LENGTH;
    this.policy = new PasswordPolicy({
      minLength: this._minLength,
      maxLength: this._maxLength,
      complexityLevel: env.APPLICATION_PASSWORD_COMPLEXITY,
    });
  }

  /**
   * 驗證密碼是否符合策略，不符合則拋出 BadRequestException
   * @param password - 待驗證密碼
   */
  validateOrThrow(password: string): void {
    const result = this.policy.validate(password);
    if (!result.valid) {
      throw new BadRequestException({
        message: '密碼不符合安全策略',
        errors: result.errors,
      });
    }
  }

  get minLength(): number {
    return this._minLength;
  }

  get maxLength(): number {
    return this._maxLength;
  }
}
