import { Global, Module } from '@nestjs/common';
import { GoogleRecaptchaAdapter } from '../adapter/out/recaptcha/GoogleRecaptchaAdapter';
import { RECAPTCHA_VERIFY_PORT } from '../application/port/out/auth/RecaptchaVerifyPort';

/** @Global() — reCAPTCHA 驗證 Port 全域可用 */
@Global()
@Module({
  providers: [
    GoogleRecaptchaAdapter,
    { provide: RECAPTCHA_VERIFY_PORT, useExisting: GoogleRecaptchaAdapter },
  ],
  exports: [RECAPTCHA_VERIFY_PORT],
})
export class RecaptchaModule {}
