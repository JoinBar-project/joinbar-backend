import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import {
  TransformInterceptor,
  ApiSuccessResponse,
} from './TransformInterceptor';

const mockReflector = { get: jest.fn() } as unknown as Reflector;

const makeContext = (): ExecutionContext =>
  ({
    getHandler: () => jest.fn(),
  }) as unknown as ExecutionContext;

const makeHandler = (data: unknown): CallHandler => ({
  handle: () => of(data),
});

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockReflector.get as jest.Mock).mockReturnValue(undefined);
    interceptor = new TransformInterceptor(mockReflector);
  });

  it('回傳有值的 data → 包含 data 欄位', async () => {
    const result = (await firstValueFrom(
      interceptor.intercept(
        makeContext(),
        makeHandler({ id: 1, name: 'Alan' }),
      ),
    )) as ApiSuccessResponse<unknown>;

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: 'Alan' });
    expect(result.timestamp).toBeDefined();
  });

  it('回傳 null → 不包含 data 欄位', async () => {
    const result = (await firstValueFrom(
      interceptor.intercept(makeContext(), makeHandler(null)),
    )) as ApiSuccessResponse<unknown>;

    expect(result.success).toBe(true);
    expect('data' in result).toBe(false);
  });

  it('回傳 undefined → 不包含 data 欄位', async () => {
    const result = (await firstValueFrom(
      interceptor.intercept(makeContext(), makeHandler(undefined)),
    )) as ApiSuccessResponse<unknown>;

    expect(result.success).toBe(true);
    expect('data' in result).toBe(false);
  });

  it('timestamp 為 ISO 8601 格式', async () => {
    const result = (await firstValueFrom(
      interceptor.intercept(makeContext(), makeHandler('ok')),
    )) as ApiSuccessResponse<unknown>;

    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('@Render 路由 → 跳過 wrap，直接回傳原始 data', async () => {
    (mockReflector.get as jest.Mock).mockReturnValue('my-template');

    const rawData = { title: 'Hello', items: [1, 2] };
    const result = await firstValueFrom(
      interceptor.intercept(makeContext(), makeHandler(rawData)),
    );

    expect(result).toEqual(rawData);
    expect((result as Record<string, unknown>).success).toBeUndefined();
  });
});
