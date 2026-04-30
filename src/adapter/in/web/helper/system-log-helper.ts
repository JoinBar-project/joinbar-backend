import { Request } from 'express';
import { UserContext } from '../decorator/current-user.decorator';
import { sanitize, sanitizeUrl } from '../../../../infrastructure/sanitize';
import { SystemLogData } from '../../../../application/port/out/shared/SaveSystemLogPort';

/**
 * HTTP request から SystemLogData の共通フィールドを生成する。
 * LoggingInterceptor（成功パス）と GlobalExceptionFilter（エラーパス）で共用。
 * HTTP request 建立 SystemLogData 的公共欄位，供 LoggingInterceptor 與 GlobalExceptionFilter 共用。
 */
export function buildSystemLogData(
  request: Request,
  statusCode: number,
  responsePayload: unknown,
  startTime: Date,
  responseTime: Date,
  overrides?: Partial<SystemLogData>,
): SystemLogData {
  const { method, ip } = request;
  const url = sanitizeUrl(request.url);
  const user = (request as Request & { user?: UserContext }).user;

  return {
    userId: user?.sub,
    action: `${method} ${url}`,
    ipAddress: ip,
    method,
    url,
    request: sanitize({
      // 只記錄診斷用 header，避免 Authorization / Cookie 等敏感欄位進入 log
      headers: {
        'user-agent': request.headers['user-agent'],
        'content-type': request.headers['content-type'],
        'x-request-id': request.headers['x-request-id'],
        'x-forwarded-for': request.headers['x-forwarded-for'],
      },
      body: request.body,
      query: request.query,
    }),
    response: sanitize(responsePayload),
    statusCode,
    execTime: (responseTime.getTime() - startTime.getTime()) / 1000,
    requestTime: startTime,
    responseTime,
    ...overrides,
  };
}
