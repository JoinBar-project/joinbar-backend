import { FeatureFlagService } from './FeatureFlagService';

jest.mock('../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    APPLICATION_AUTH_LOG_ENABLED: false,
    APPLICATION_EMAIL_VERIFICATION_ENABLED: true,
    APPLICATION_LINE_PAY_ENABLED: false,
    APPLICATION_GEMINI_ENABLED: true,
    APPLICATION_SUBSCRIPTION_ENABLED: false,
    APPLICATION_IP_WHITELIST_ENABLED: false,
    APPLICATION_IP_BLACKLIST_ENABLED: false,
    APPLICATION_ACCOUNT_LOCK_ENABLED: true,
    APPLICATION_PASSWORD_CHANGE_ENABLED: false,
    APPLICATION_SESSION_IDLE_ENABLED: true,
    APPLICATION_GOOGLE_RECAPTCHA_ENABLED: false,
    APPLICATION_API_LOG_ENABLED: false,
    APPLICATION_OPERATION_LOG_ENABLED: false,
  }),
}));

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
    service.onModuleInit();
  });

  it('啟用的開關回傳 true', () => {
    expect(service.isEnabled('emailVerificationEnabled')).toBe(true);
    expect(service.isEnabled('geminiEnabled')).toBe(true);
    expect(service.isEnabled('accountLockEnabled')).toBe(true);
    expect(service.isEnabled('sessionIdleEnabled')).toBe(true);
  });

  it('停用的開關回傳 false', () => {
    expect(service.isEnabled('authLogEnabled')).toBe(false);
    expect(service.isEnabled('linePayEnabled')).toBe(false);
    expect(service.isEnabled('subscriptionEnabled')).toBe(false);
    expect(service.isEnabled('ipWhitelistEnabled')).toBe(false);
    expect(service.isEnabled('googleRecaptchaEnabled')).toBe(false);
    expect(service.isEnabled('apiLogEnabled')).toBe(false);
  });
});
