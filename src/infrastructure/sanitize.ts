const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'access_token',
  'authorization',
  'secret',
  'private_key',
  'api_key',
  'bearer',
]);

const SENSITIVE_QUERY_PARAMS = new Set([
  'email',
  'phone',
  'name',
  'token',
  'key',
]);

export const sanitize = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'string' && value.startsWith('data:image')) {
        return '[BASE64_IMAGE_REMOVED]';
      }
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        return '[REDACTED]';
      }
      if (key === 'file' || key === 'files') {
        return '[FILE_DATA_REMOVED]';
      }
      return value;
    });
  } catch {
    return '[Unserializable data]';
  }
};

/**
 * URL query string 中的 PII 欄位值遮蔽。
 * 範例：`/users?email=user@example.com` → `/users?email=[REDACTED]`
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const [path, query] = url.split('?');
    if (!query) return url;
    const sanitized = query
      .split('&')
      .map((part) => {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) return part;
        const key = part.slice(0, eqIdx);
        if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
          return `${key}=[REDACTED]`;
        }
        return part;
      })
      .join('&');
    return `${path}?${sanitized}`;
  } catch {
    return url;
  }
};
