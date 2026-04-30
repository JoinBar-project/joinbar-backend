import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/zh-tw';
import { getEnv } from './validate-env';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-tw');

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'] as const;

export const formatDate = (d: Date | string | null): string => {
  if (!d) return '';
  return dayjs(d).format('YYYY-MM-DD');
};

export const formatYMD = (y: number, m: number, d: number): string =>
  dayjs(new Date(y, m - 1, d)).format('YYYY年MM月DD日');

/** 將 Date 轉為 UTC 基準的 YYYY-MM-DD 字串 */
export const toDateStr = (d: Date): string => d.toISOString().slice(0, 10);

export const formatDateWithDay = (d: Date | string | null): string => {
  if (!d) return '';
  const date = dayjs(d);
  return `${date.format('YYYY-MM-DD')} (${DAY_NAMES[date.day()]})`;
};

/** 以 APP_TIMEZONE 取得當下時間 */
export const nowInAppTz = (): dayjs.Dayjs => dayjs().tz(getEnv().APP_TIMEZONE);

/** 以 APP_TIMEZONE 為基準的今日（YYYY-MM-DD） */
export const todayInAppTz = (): string => nowInAppTz().format('YYYY-MM-DD');

export default dayjs;
