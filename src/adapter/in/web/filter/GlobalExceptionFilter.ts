import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  SAVE_SYSTEM_LOG_PORT,
  SaveSystemLogPort,
} from '../../../../application/port/out/shared/SaveSystemLogPort';
import { buildSystemLogData } from '../helper/system-log-helper';
import { AccountDisabledException } from '../../../../domain/exception/AccountDisabledException';
import { InvalidRefreshTokenException } from '../../../../domain/exception/InvalidRefreshTokenException';
import { PasswordChangeRequiredException } from '../../../../domain/exception/PasswordChangeRequiredException';
import { EmailAlreadyExistsException } from '../../../../domain/exception/EmailAlreadyExistsException';
import { InvalidPasswordResetTokenException } from '../../../../domain/exception/InvalidPasswordResetTokenException';
import { InvalidEmailVerificationTokenException } from '../../../../domain/exception/InvalidEmailVerificationTokenException';
import { NoEmailProviderException } from '../../../../domain/exception/NoEmailProviderException';

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Inject(SAVE_SYSTEM_LOG_PORT)
    private readonly saveSystemLog: SaveSystemLogPort,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: string;

    if (exception instanceof AccountDisabledException) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
      code = 'ACCOUNT_DISABLED';
    } else if (exception instanceof InvalidRefreshTokenException) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      code = 'INVALID_REFRESH_TOKEN';
    } else if (exception instanceof PasswordChangeRequiredException) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
      code = 'PASSWORD_CHANGE_REQUIRED';
    } else if (exception instanceof EmailAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      code = 'EMAIL_ALREADY_EXISTS';
    } else if (exception instanceof InvalidPasswordResetTokenException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'INVALID_PASSWORD_RESET_TOKEN';
    } else if (exception instanceof InvalidEmailVerificationTokenException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'INVALID_EMAIL_VERIFICATION_TOKEN';
    } else if (exception instanceof NoEmailProviderException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = exception.message;
      code = 'NO_EMAIL_PROVIDER';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      code = exception.constructor.name
        .replace('Exception', '')
        .replace(/([A-Z])/g, '_$1')
        .replace(/^_/, '')
        .toUpperCase();
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = 'INTERNAL_SERVER_ERROR';
    }

    const now = new Date();
    const startTime =
      (request as Request & { _startTime?: Date })._startTime ?? now;

    this.logger.error(
      message,
      exception instanceof Error ? exception.stack : String(exception),
    );

    void this.saveSystemLog
      .saveSystemLog(
        buildSystemLogData(
          request,
          status,
          { statusCode: status, message },
          startTime,
          now,
          { action: '異常紀錄' },
        ),
      )
      .catch((err) =>
        this.logger.error(
          'Exception system log 寫入失敗',
          err instanceof Error ? err.stack : String(err),
        ),
      );

    const body: ApiErrorResponse = {
      success: false,
      message,
      code,
      timestamp: now.toISOString(),
    };

    response.status(status).json(body);
  }
}
