import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RecaptchaVerifyPort } from '../../../application/port/out/auth/RecaptchaVerifyPort';
import { getEnv } from '../../../infrastructure/validate-env';

/** Google reCAPTCHA 驗證 API 回應格式 */
interface RecaptchaResponse {
  success: boolean;
  score?: number; // v3 only
  action?: string;
  'error-codes'?: string[];
}

/**
 * Google reCAPTCHA 驗證 Adapter。
 * 非正式環境（GOOGLE_RECAPTCHA_IS_PRODUCTION = false）時永遠回傳 true。
 */
@Injectable()
export class GoogleRecaptchaAdapter
  implements RecaptchaVerifyPort, OnModuleInit
{
  private readonly logger = new Logger(GoogleRecaptchaAdapter.name);
  private secret = '';
  private isProduction = false;
  private version: 'v2' | 'v3' = 'v2';

  onModuleInit(): void {
    const env = getEnv();
    this.secret = env.GOOGLE_RECAPTCHA_SECRET ?? '';
    this.isProduction = env.GOOGLE_RECAPTCHA_IS_PRODUCTION;
    this.version = env.GOOGLE_RECAPTCHA_VERSION;
  }

  async verify(token: string, ip?: string): Promise<boolean> {
    // 非正式環境直接通過
    if (!this.isProduction) {
      this.logger.debug('reCAPTCHA 非正式環境，驗證直接通過');
      return true;
    }

    if (!this.secret) {
      this.logger.error('reCAPTCHA Secret 未設定');
      return false;
    }

    try {
      const params = new URLSearchParams({
        secret: this.secret,
        response: token,
      });
      if (ip) params.append('remoteip', ip);

      const res = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        },
      );

      const data = (await res.json()) as RecaptchaResponse;

      if (!data.success) {
        this.logger.warn(
          `reCAPTCHA 驗證失敗: ${data['error-codes']?.join(', ') ?? '未知錯誤'}`,
        );
        return false;
      }

      // v3 需檢查分數（預設門檻 0.5）
      if (this.version === 'v3' && data.score !== undefined) {
        const passed = data.score >= 0.5;
        if (!passed) {
          this.logger.warn(`reCAPTCHA v3 分數過低: ${data.score}`);
        }
        return passed;
      }

      return true;
    } catch (err) {
      this.logger.error('reCAPTCHA 驗證請求失敗', err);
      return false;
    }
  }
}
