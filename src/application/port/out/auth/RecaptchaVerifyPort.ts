export const RECAPTCHA_VERIFY_PORT = 'RECAPTCHA_VERIFY_PORT';

export interface RecaptchaVerifyPort {
  /**
   * 驗證 reCAPTCHA token
   * @param token - 前端傳入的 reCAPTCHA token
   * @param ip - 用戶端 IP（可選，用於增強驗證）
   * @returns 是否驗證通過
   */
  verify(token: string, ip?: string): Promise<boolean>;
}
