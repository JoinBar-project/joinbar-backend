/**
 * Redis Key 格式集中管理。
 * 所有需要組合 key 的地方都引用此函式，確保格式一致。
 */
export const buildUserContextKey = (
  prefix: string,
  userId: string,
): string => `${prefix}user:${userId}`;

export const buildFailedLoginKey = (prefix: string, email: string): string =>
  `${prefix}failed-login:${email}`;

export const buildFailedIpKey = (prefix: string, ip: string): string =>
  `${prefix}failed-ip:${ip}`;

export const buildSessionActivityKey = (
  prefix: string,
  userId: string,
): string => `${prefix}session:activity:${userId}`;

export const buildPasswordResetKey = (prefix: string, token: string): string =>
  `${prefix}password-reset:${token}`;
