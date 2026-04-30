const COMMON_WEAK_STRINGS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'admin',
  'welcome',
  'monkey',
  'master',
  'dragon',
  'login',
  'princess',
  'football',
  'shadow',
  'sunshine',
  'trustno1',
  'iloveyou',
];

export interface PasswordPolicyConfig {
  minLength: number;
  maxLength: number;
  /** 0=僅長度, 1=大小寫+數字, 2=+特殊符號, 3=+禁用常見弱密碼 */
  complexityLevel: number;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export class PasswordPolicy {
  constructor(private readonly config: PasswordPolicyConfig) {}

  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    if (password.length < this.config.minLength)
      errors.push(`密碼長度不得少於 ${this.config.minLength} 個字元`);
    if (password.length > this.config.maxLength)
      errors.push(`密碼長度不得超過 ${this.config.maxLength} 個字元`);
    if (this.config.complexityLevel >= 1) {
      if (!/[a-z]/.test(password))
        errors.push('密碼須包含至少一個小寫英文字母');
      if (!/[A-Z]/.test(password))
        errors.push('密碼須包含至少一個大寫英文字母');
      if (!/\d/.test(password)) errors.push('密碼須包含至少一個數字');
    }
    if (this.config.complexityLevel >= 2) {
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password))
        errors.push('密碼須包含至少一個特殊符號');
    }
    if (this.config.complexityLevel >= 3) {
      const lower = password.toLowerCase();
      for (const weak of COMMON_WEAK_STRINGS) {
        if (lower.includes(weak)) {
          errors.push(`密碼不可包含常見字串「${weak}」`);
          break;
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
