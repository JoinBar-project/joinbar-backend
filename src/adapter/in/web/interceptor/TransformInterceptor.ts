import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

const RENDER_METADATA = '__renderTemplate__';

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data?: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T> {
    // @Render 路由回傳 view context，不可 wrap
    const renderTemplate = this.reflector.get<string>(
      RENDER_METADATA,
      context.getHandler(),
    );
    if (renderTemplate) return next.handle();

    return next.handle().pipe(
      map((data) => {
        // StreamableFile 是二進位回應，不 wrap
        if (data instanceof StreamableFile) return data;
        return {
          success: true as const,
          ...(data !== null && data !== undefined && { data }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
