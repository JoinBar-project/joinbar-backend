import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './GlobalExceptionFilter';
import { SaveSystemLogPort } from '../../../../application/port/out/shared/SaveSystemLogPort';

// buildSystemLogData 內部呼叫 getEnv()
jest.mock('../../../../infrastructure/validate-env', () => ({
  getEnv: () => ({ REDIS_KEY_PREFIX: 'test:', SERVICE_NAME: 'test' }),
}));

const makeJson = () => jest.fn();
const makeStatus = (json: jest.Mock) => jest.fn().mockReturnValue({ json });

const makeHost = (): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} => {
  const json = makeJson();
  const status = makeStatus(json);
  const request = {
    method: 'GET',
    url: '/test',
    headers: {},
    body: {},
    query: {},
    ip: '127.0.0.1',
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
};

const mockSaveSystemLog: jest.Mocked<SaveSystemLogPort> = {
  saveSystemLog: jest.fn().mockResolvedValue(undefined),
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new GlobalExceptionFilter(mockSaveSystemLog);
  });

  describe('HTTP Exception → code 轉為 SNAKE_UPPER_CASE', () => {
    it('NotFoundException → 404, NOT_FOUND', () => {
      const { host, json, status } = makeHost();
      filter.catch(new NotFoundException('找不到'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const body = (
        json.mock.calls[0] as [{ code: string; success: boolean }]
      )[0];
      expect(body.code).toBe('NOT_FOUND');
      expect(body.success).toBe(false);
    });

    it('ForbiddenException → 403, FORBIDDEN', () => {
      const { host, json, status } = makeHost();
      filter.catch(new ForbiddenException('禁止'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      const body = (json.mock.calls[0] as [{ code: string }])[0];
      expect(body.code).toBe('FORBIDDEN');
    });

    it('BadRequestException → 400, BAD_REQUEST', () => {
      const { host, json, status } = makeHost();
      filter.catch(new BadRequestException('格式錯誤'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = (json.mock.calls[0] as [{ code: string }])[0];
      expect(body.code).toBe('BAD_REQUEST');
    });

    it('UnauthorizedException → 401, UNAUTHORIZED', () => {
      const { host, json } = makeHost();
      filter.catch(new UnauthorizedException('未授權'), host);

      const body = (json.mock.calls[0] as [{ code: string }])[0];
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  it('非 HttpException → 500, INTERNAL_SERVER_ERROR', () => {
    const { host, json, status } = makeHost();
    filter.catch(new Error('unexpected'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = (json.mock.calls[0] as [{ code: string; message: string }])[0];
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.message).toBe('Internal server error');
  });

  it('response 結構包含 success:false 與 timestamp', () => {
    const { host, json } = makeHost();
    filter.catch(new NotFoundException(), host);

    const body = (
      json.mock.calls[0] as [{ success: boolean; timestamp: string }]
    )[0];
    expect(body.success).toBe(false);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
