import { nowInAppTz, todayInAppTz } from './date';

jest.mock('./validate-env', () => ({
  getEnv: () => ({ APP_TIMEZONE: 'Asia/Tokyo' }),
}));

describe('date helpers (APP_TIMEZONE)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('todayInAppTz() 以 APP_TIMEZONE 計算日期', () => {
    jest.useFakeTimers();
    // UTC 2026-04-11 23:30 = JST 2026-04-12 08:30
    jest.setSystemTime(new Date('2026-04-11T23:30:00Z'));
    expect(todayInAppTz()).toBe('2026-04-12');
  });

  it('nowInAppTz() 回傳 dayjs 物件', () => {
    const now = nowInAppTz();
    expect(typeof now.format).toBe('function');
  });
});
