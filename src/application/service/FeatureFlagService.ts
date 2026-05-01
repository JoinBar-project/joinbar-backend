import { Injectable, OnModuleInit } from '@nestjs/common';
import { getEnv } from '../../infrastructure/validate-env';

export type FeatureFlagName =
  | 'authLogEnabled'
  | 'emailVerificationEnabled'
  | 'linePayEnabled'
  | 'geminiEnabled'
  | 'subscriptionEnabled'
  | 'ipWhitelistEnabled'
  | 'ipBlacklistEnabled'
  | 'accountLockEnabled'
  | 'passwordChangeEnabled'
  | 'sessionIdleEnabled'
  | 'googleRecaptchaEnabled'
  | 'apiLogEnabled'
  | 'operationLogEnabled'
  | 'logoutAfterPasswordResetEnabled';

/**
 * 功能開關服務：從環境變數讀取功能啟用狀態。
 * 各 Guard / Service 透過 isEnabled() 判斷功能是否啟用。
 */
@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private flags: Record<FeatureFlagName, boolean> = {} as Record<
    FeatureFlagName,
    boolean
  >;

  onModuleInit(): void {
    const env = getEnv();
    this.flags = {
      authLogEnabled: env.APPLICATION_AUTH_LOG_ENABLED,
      emailVerificationEnabled: env.APPLICATION_EMAIL_VERIFICATION_ENABLED,
      linePayEnabled: env.APPLICATION_LINE_PAY_ENABLED,
      geminiEnabled: env.APPLICATION_GEMINI_ENABLED,
      subscriptionEnabled: env.APPLICATION_SUBSCRIPTION_ENABLED,
      ipWhitelistEnabled: env.APPLICATION_IP_WHITELIST_ENABLED,
      ipBlacklistEnabled: env.APPLICATION_IP_BLACKLIST_ENABLED,
      accountLockEnabled: env.APPLICATION_ACCOUNT_LOCK_ENABLED,
      passwordChangeEnabled: env.APPLICATION_PASSWORD_CHANGE_ENABLED,
      sessionIdleEnabled: env.APPLICATION_SESSION_IDLE_ENABLED,
      googleRecaptchaEnabled: env.APPLICATION_GOOGLE_RECAPTCHA_ENABLED,
      apiLogEnabled: env.APPLICATION_API_LOG_ENABLED,
      operationLogEnabled: env.APPLICATION_OPERATION_LOG_ENABLED,
      logoutAfterPasswordResetEnabled:
        env.APPLICATION_IS_LOGOUT_AFTER_PASSWORD_RESET,
    };
  }

  /**
   * 檢查指定功能是否啟用
   * @param flag - 功能名稱
   */
  isEnabled(flag: FeatureFlagName): boolean {
    return this.flags[flag] ?? false;
  }
}
