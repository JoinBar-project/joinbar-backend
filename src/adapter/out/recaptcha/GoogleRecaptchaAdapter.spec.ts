import { GoogleRecaptchaAdapter } from './GoogleRecaptchaAdapter';

const mockEnv = {
  NODE_ENV: 'production' as 'development' | 'production' | 'test',
  GOOGLE_RECAPTCHA_SECRET: 'test-secret' as string | undefined,
  GOOGLE_RECAPTCHA_VERSION: 'v2' as 'v2' | 'v3',
};

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => mockEnv,
}));

describe('GoogleRecaptchaAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockEnv.NODE_ENV = 'production';
    mockEnv.GOOGLE_RECAPTCHA_SECRET = 'test-secret';
    mockEnv.GOOGLE_RECAPTCHA_VERSION = 'v2';
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const makeAdapter = (): GoogleRecaptchaAdapter => {
    const adapter = new GoogleRecaptchaAdapter();
    adapter.onModuleInit();
    return adapter;
  };

  it('NODE_ENV !== "production" → 不打 API，直接通過', async () => {
    mockEnv.NODE_ENV = 'development';
    const adapter = makeAdapter();

    const result = await adapter.verify('any-token');

    expect(result).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('production 但未設定 secret → 拒絕', async () => {
    mockEnv.GOOGLE_RECAPTCHA_SECRET = undefined;
    const adapter = makeAdapter();

    const result = await adapter.verify('token');

    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('production v2 + Google 回傳 success=true → 通過', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    const adapter = makeAdapter();

    const result = await adapter.verify('token', '1.2.3.4');

    expect(result).toBe(true);
  });

  it('production v2 + Google 回傳 success=false → 拒絕', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () =>
        Promise.resolve({ success: false, 'error-codes': ['invalid-token'] }),
    });
    const adapter = makeAdapter();

    const result = await adapter.verify('token');

    expect(result).toBe(false);
  });

  it('production v3 分數 ≥ 0.5 → 通過', async () => {
    mockEnv.GOOGLE_RECAPTCHA_VERSION = 'v3';
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, score: 0.7 }),
    });
    const adapter = makeAdapter();

    const result = await adapter.verify('token');

    expect(result).toBe(true);
  });

  it('production v3 分數 < 0.5 → 拒絕', async () => {
    mockEnv.GOOGLE_RECAPTCHA_VERSION = 'v3';
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, score: 0.3 }),
    });
    const adapter = makeAdapter();

    const result = await adapter.verify('token');

    expect(result).toBe(false);
  });

  it('fetch 失敗 → 拒絕（不拋）', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
    const adapter = makeAdapter();

    const result = await adapter.verify('token');

    expect(result).toBe(false);
  });
});
