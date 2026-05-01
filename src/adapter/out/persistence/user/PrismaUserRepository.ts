import { Injectable } from '@nestjs/common';
import { ProviderTypeEnum, UserRoleEnum } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  FindUserPort,
  UserWithPassword,
  LineProviderData,
  EmailVerifyTokenData,
} from '../../../../application/port/out/user/FindUserPort';
import { SaveUserPort } from '../../../../application/port/out/user/SaveUserPort';
import {
  LoadUserContextPort,
  UserContextData,
} from '../../../../application/port/out/user/LoadUserContextPort';
import { User } from '../../../../domain/model/User';
import { RoleName } from '../../../../domain/value-object/Role';

@Injectable()
export class PrismaUserRepository
  implements FindUserPort, SaveUserPort, LoadUserContextPort
{
  constructor(private readonly prisma: PrismaService) {}

  // ─── FindUserPort ────────────────────────────────────────────────────

  async findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPassword | null> {
    const provider = await this.prisma.userAuthProvider.findFirst({
      where: { provider: ProviderTypeEnum.EMAIL, email },
      include: { user: true },
    });
    if (!provider || !provider.password) return null;

    return {
      user: this.toUser(provider.user),
      passwordHash: provider.password,
      providerId: provider.id,
    };
  }

  async findByProviderUid(
    provider: 'LINE' | 'GOOGLE',
    uid: string,
  ): Promise<User | null> {
    const record = await this.prisma.userAuthProvider.findUnique({
      where: {
        provider_providerId: {
          provider: provider as ProviderTypeEnum,
          providerId: uid,
        },
      },
      include: { user: true },
    });
    return record ? this.toUser(record.user) : null;
  }

  async findById(userId: string): Promise<User | null> {
    const record = await this.prisma.userRecord.findUnique({
      where: { id: userId },
    });
    return record ? this.toUser(record) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.userAuthProvider.count({
      where: { provider: ProviderTypeEnum.EMAIL, email },
    });
    return count > 0;
  }

  async findByEmailVerifyToken(
    token: string,
  ): Promise<EmailVerifyTokenData | null> {
    const provider = await this.prisma.userAuthProvider.findFirst({
      where: { provider: ProviderTypeEnum.EMAIL, verifyToken: token },
      select: { userId: true, verifyExpires: true },
    });
    return provider ?? null;
  }

  // ─── SaveUserPort ────────────────────────────────────────────────────

  async createWithEmailProvider(
    user: User,
    passwordHash: string,
    verifyToken?: string,
    verifyExpires?: Date,
  ): Promise<void> {
    await this.prisma.userRecord.create({
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email?.toString() ?? null,
        role: user.role as UserRoleEnum,
        authProviders: {
          create: {
            provider: ProviderTypeEnum.EMAIL,
            email: user.email?.toString() ?? null,
            password: passwordHash,
            isVerified: !verifyToken,
            verifyToken: verifyToken ?? null,
            verifyExpires: verifyExpires ?? null,
          },
        },
      },
    });
  }

  async createWithLineProvider(
    user: User,
    lineData: LineProviderData,
  ): Promise<void> {
    await this.prisma.userRecord.create({
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: lineData.email ?? null,
        role: user.role as UserRoleEnum,
        authProviders: {
          create: {
            provider: ProviderTypeEnum.LINE,
            providerId: lineData.lineUid,
            email: lineData.email,
            displayName: lineData.displayName,
            pictureUrl: lineData.pictureUrl,
            lineStatusMessage: lineData.statusMessage,
            isVerified: true,
          },
        },
      },
    });
  }

  async upsertLineProvider(
    userId: string,
    lineData: LineProviderData,
  ): Promise<void> {
    await this.prisma.userAuthProvider.upsert({
      where: {
        provider_providerId: {
          provider: ProviderTypeEnum.LINE,
          providerId: lineData.lineUid,
        },
      },
      create: {
        userId,
        provider: ProviderTypeEnum.LINE,
        providerId: lineData.lineUid,
        email: lineData.email,
        displayName: lineData.displayName,
        pictureUrl: lineData.pictureUrl,
        lineStatusMessage: lineData.statusMessage,
        isVerified: true,
      },
      update: {
        displayName: lineData.displayName,
        pictureUrl: lineData.pictureUrl,
        lineStatusMessage: lineData.statusMessage,
      },
    });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userAuthProvider.updateMany({
        where: { userId, provider: ProviderTypeEnum.EMAIL },
        data: { password: newPasswordHash },
      }),
      this.prisma.userRecord.update({
        where: { id: userId },
        data: { lastPasswordChange: new Date() },
      }),
    ]);
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.prisma.userAuthProvider.updateMany({
      where: { userId, provider: ProviderTypeEnum.EMAIL },
      data: { isVerified: true, verifyToken: null, verifyExpires: null },
    });
  }

  async updateLoginSecurity(
    userId: string,
    failedLoginCount: number,
    lockedAt: Date | null,
  ): Promise<void> {
    await this.prisma.userRecord.update({
      where: { id: userId },
      data: { failedLoginCount, lockedAt },
    });
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    // fire-and-forget：失敗不影響主流程
    this.prisma.userAuthProvider
      .updateMany({ where: { userId }, data: {} })
      .catch(() => {});
  }

  // ─── LoadUserContextPort ────────────────────────────────────────────

  async loadUserContext(userId: string): Promise<UserContextData | null> {
    const record = await this.prisma.userRecord.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
        lastPasswordChange: true,
      },
    });
    if (!record) return null;

    return {
      id: record.id,
      email: record.email ?? '',
      roleName: record.role as string,
      permissions: [],
      status: record.deletedAt === null,
      lastPasswordChange: record.lastPasswordChange,
    };
  }

  // ─── 私有工具 ────────────────────────────────────────────────────────

  private toUser(record: {
    id: string;
    email: string | null;
    username: string;
    nickname: string | null;
    role: string;
    failedLoginCount: number;
    lockedAt: Date | null;
    lastPasswordChange: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  }): User {
    return User.reconstitute({
      id: record.id,
      email: record.email,
      username: record.username,
      nickname: record.nickname,
      role: record.role as RoleName,
      failedLoginCount: record.failedLoginCount,
      lockedAt: record.lockedAt,
      lastPasswordChange: record.lastPasswordChange,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
    });
  }
}
