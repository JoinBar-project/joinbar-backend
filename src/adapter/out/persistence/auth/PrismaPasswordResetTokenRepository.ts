import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  PasswordResetTokenData,
  PasswordResetTokenPort,
} from '../../../../application/port/out/auth/PasswordResetTokenPort';

/** 密碼重設 token 持久化 Adapter，操作 password_reset_tokens 表 */
@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenPort {
  constructor(private readonly prisma: PrismaService) {}

  async createToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.passwordResetTokenRecord.create({
      data: { userId, token, expiresAt },
    });
  }

  async findByToken(token: string): Promise<PasswordResetTokenData | null> {
    const record = await this.prisma.passwordResetTokenRecord.findUnique({
      where: { token },
    });
    if (!record) return null;

    return {
      id: record.id,
      userId: record.userId,
      token: record.token,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    };
  }

  async markUsed(tokenId: string): Promise<void> {
    await this.prisma.passwordResetTokenRecord.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }
}
