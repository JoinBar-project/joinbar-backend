import { z } from 'zod';
import { log } from './logger';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  SERVICE_NAME: z.string().default('joinbar-backend'),
  API_BASE_URL: z.string().optional(),

  // ─── Database（PostgreSQL）───
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default('joinbar_db'),

  // ─── JWT ───
  ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().default(7200),
  REFRESH_SECRET: z
    .string()
    .min(32)
    .or(z.literal(''))
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().default(604800),
  SESSION_SECRET: z
    .string()
    .min(32)
    .or(z.literal(''))
    .optional()
    .transform((v) => (v === '' ? undefined : v)),

  // ─── Redis ───
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_KEY_PREFIX: z.string().default('joinbar:'),
  REDIS_TTL: z.coerce.number().default(0),
  REDIS_URL: z.string().optional(),

  // ─── CORS / Cookie ───
  CORS_ORIGIN: z.string().default('*'),
  COOKIE_SECRET: z.string().min(32),

  // ─── Firebase（Auth + Storage）───
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),

  // ─── LINE Login OAuth ───
  LINE_CHANNEL_ID: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_CALLBACK_URL: z
    .string()
    .default('http://localhost:3000/api/auth/line/callback'),

  // ─── LINE Pay ───
  LINEPAY_CHANNEL_ID: z.string().optional(),
  LINEPAY_CHANNEL_SECRET: z.string().optional(),
  LINEPAY_CONFIRM_URL: z
    .string()
    .default('http://localhost:3000/api/linepay/confirm'),
  LINEPAY_CANCEL_URL: z
    .string()
    .default('http://localhost:3000/api/linepay/cancel'),
  LINEPAY_ENV: z.enum(['sandbox', 'production']).default('sandbox'),

  // ─── Google Gemini AI ───
  GEMINI_API_KEY: z.string().optional(),

  // ─── Email SMTP ───
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // ─── 分頁 ───
  DEFAULT_PAGE_LIMIT: z.coerce.number().int().positive().default(10),

  // ─── 權限快取 TTL（秒）───
  PERMISSION_CACHE_TTL: z.coerce.number().int().positive().default(300),

  // ─── bcrypt ───
  BCRYPT_ROUNDS: z.coerce.number().int().min(1).default(10),

  // ─── 速率限制 ───
  COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // ─── 功能開關（Feature Flags）───
  APPLICATION_AUTH_LOG_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  APPLICATION_EMAIL_VERIFICATION_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  APPLICATION_LINE_PAY_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  APPLICATION_GEMINI_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  APPLICATION_SUBSCRIPTION_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  APPLICATION_IP_WHITELIST_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  APPLICATION_IP_BLACKLIST_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  APPLICATION_ACCOUNT_LOCK_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  APPLICATION_PASSWORD_CHANGE_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  APPLICATION_SESSION_IDLE_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  APPLICATION_GOOGLE_RECAPTCHA_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  APPLICATION_API_LOG_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  APPLICATION_OPERATION_LOG_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // ─── 密碼策略 ───
  APPLICATION_PASSWORD_MIN_LENGTH: z.coerce.number().int().min(1).default(8),
  APPLICATION_PASSWORD_MAX_LENGTH: z.coerce.number().int().min(1).default(32),
  APPLICATION_PASSWORD_COMPLEXITY: z.coerce
    .number()
    .int()
    .min(0)
    .max(3)
    .default(1),
  APPLICATION_PASSWORD_CHANGE_PERIOD: z.coerce
    .number()
    .int()
    .min(0)
    .default(6),
  APPLICATION_IS_LOGOUT_AFTER_PASSWORD_RESET: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // ─── 帳號鎖定 ───
  APPLICATION_ACCOUNT_LOCK_THRESHOLD: z.coerce
    .number()
    .int()
    .min(1)
    .default(5),
  APPLICATION_IP_BLOCK_THRESHOLD: z.coerce.number().int().min(1).default(10),

  // ─── Google reCAPTCHA ───
  GOOGLE_RECAPTCHA_SECRET: z.string().optional(),
  GOOGLE_RECAPTCHA_SITE_KEY: z.string().optional(),
  GOOGLE_RECAPTCHA_VERSION: z.enum(['v2', 'v3']).default('v2'),
  GOOGLE_RECAPTCHA_IS_PRODUCTION: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // ─── 閒置自動登出（分鐘）───
  APPLICATION_SESSION_IDLE_TIMEOUT: z.coerce
    .number()
    .int()
    .min(1)
    .default(120),

  // ─── 密碼重設 ───
  APP_PASSWORD_RESET_TOKEN_EXPIRES_IN: z.coerce
    .number()
    .int()
    .min(1)
    .default(30),
  APP_PASSWORD_RESET_URL: z.string().optional(),

  // ─── Seed 預設帳號 ───
  ADMIN_DEFAULT_EMAIL: z.string().default('admin@test.com'),
  ADMIN_DEFAULT_PASSWORD: z.string().default('Admin1234!'),

  // ─── 時區 ───
  APP_TIMEZONE: z
    .string()
    .default('Asia/Taipei')
    .refine(
      (v) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      },
      { message: '無法被 Intl 解析的 IANA 時區' },
    ),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * 取得已驗證的環境變數（singleton）。
 * 第一次呼叫時解析並快取，之後直接回傳快取值。
 */
export const getEnv = (): Env => {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    log.error('環境變數驗證失敗');
    result.error.issues.forEach((issue) => {
      log.error(
        { field: issue.path.join('.'), message: issue.message },
        '驗證錯誤',
      );
    });
    process.exit(1);
  }

  _env = result.data;

  // 生產環境額外驗證
  if (_env.NODE_ENV === 'production') {
    const productionErrors: string[] = [];
    if (_env.CORS_ORIGIN === '*') {
      productionErrors.push(
        'CORS_ORIGIN: 生產環境不允許設定為 *，請指定明確的來源網域',
      );
    }
    if (!_env.DB_PASSWORD) {
      productionErrors.push('DB_PASSWORD: 生產環境不允許空密碼');
    }
    if (
      _env.ACCESS_SECRET.includes('change-in-production') ||
      _env.ACCESS_SECRET.length < 32
    ) {
      productionErrors.push(
        'ACCESS_SECRET: 不可使用預設佔位值，請設定至少 32 字元的隨機字串',
      );
    }
    if (
      !_env.REFRESH_SECRET ||
      _env.REFRESH_SECRET.includes('change-in-production') ||
      _env.REFRESH_SECRET.length < 32
    ) {
      productionErrors.push(
        'REFRESH_SECRET: 生產環境必填且至少 32 字元',
      );
    }
    if (
      _env.COOKIE_SECRET.includes('change-in-production') ||
      _env.COOKIE_SECRET.startsWith('test-')
    ) {
      productionErrors.push(
        'COOKIE_SECRET: 不可使用預設佔位值，請設定至少 32 字元的隨機字串',
      );
    }
    if (_env.BCRYPT_ROUNDS < 12) {
      productionErrors.push(
        'BCRYPT_ROUNDS: 生產環境建議設定為 12 以上以確保密碼安全性',
      );
    }
    if (productionErrors.length > 0) {
      productionErrors.forEach((msg) => log.error(msg));
      process.exit(1);
    }
  }

  return _env;
};

/** 測試專用：重置 singleton，讓下次 getEnv() 重新解析 process.env */
export const _resetEnvForTest = (): void => {
  _env = null;
};
