import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  AuthLogData,
  SaveAuthLogPort,
} from '../../../../application/port/out/auth/SaveAuthLogPort';

/** 登入日誌持久化 Adapter，寫入 auth_logs 表 */
@Injectable()
export class PrismaAuthLogRepository implements SaveAuthLogPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveAuthLog(data: AuthLogData): Promise<void> {
    await this.prisma.authLogRecord.create({
      data: {
        userId: data.userId,
        email: data.email,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        detail: data.detail,
      },
    });
  }
}
