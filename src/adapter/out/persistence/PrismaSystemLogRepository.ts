import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  SaveSystemLogPort,
  SystemLogData,
} from '../../../application/port/out/shared/SaveSystemLogPort';

@Injectable()
export class PrismaSystemLogRepository implements SaveSystemLogPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveSystemLog(data: SystemLogData): Promise<void> {
    await this.prisma.systemLogRecord.create({
      data: {
        userId: data.userId,
        action: data.action,
        ipAddress: data.ipAddress,
        method: data.method,
        url: data.url,
        request: data.request,
        response: data.response,
        statusCode: data.statusCode,
        execTime: data.execTime,
        requestTime: data.requestTime,
        responseTime: data.responseTime,
      },
    });
  }
}
