import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  IpBlacklistItem,
  IpListItem,
  IpListPort,
} from '../../../../application/port/out/security/IpListPort';

/** IP 黑白名單持久化 Adapter，查詢 ip_whitelist_records / ip_blacklist_records 表 */
@Injectable()
export class PrismaIpListRepository implements IpListPort {
  private readonly logger = new Logger(PrismaIpListRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async isWhitelisted(ip: string): Promise<boolean> {
    const record = await this.prisma.ipWhitelistRecord.findUnique({
      where: { ipAddress: ip },
      select: { id: true },
    });
    return record !== null;
  }

  async isBlacklisted(ip: string): Promise<boolean> {
    const record = await this.prisma.ipBlacklistRecord.findUnique({
      where: { ipAddress: ip },
      select: { id: true },
    });
    return record !== null;
  }

  async addToWhitelist(
    ip: string,
    description?: string,
    createdBy?: string,
  ): Promise<void> {
    await this.prisma.ipWhitelistRecord.upsert({
      where: { ipAddress: ip },
      update: { description, createdBy },
      create: { ipAddress: ip, description, createdBy },
    });
    this.logger.log(`IP ${ip} 已加入白名單`);
  }

  async addToBlacklist(
    ip: string,
    reason?: string,
    isAutoBlock = false,
    createdBy?: string,
  ): Promise<void> {
    await this.prisma.ipBlacklistRecord.upsert({
      where: { ipAddress: ip },
      update: { reason, isAutoBlock, createdBy },
      create: { ipAddress: ip, reason, isAutoBlock, createdBy },
    });
    this.logger.log(`IP ${ip} 已加入黑名單（自動封鎖: ${isAutoBlock}）`);
  }

  async removeFromWhitelist(ip: string): Promise<void> {
    await this.prisma.ipWhitelistRecord
      .delete({ where: { ipAddress: ip } })
      .catch(() => {});
  }

  async removeFromBlacklist(ip: string): Promise<void> {
    await this.prisma.ipBlacklistRecord
      .delete({ where: { ipAddress: ip } })
      .catch(() => {});
  }

  async listWhitelist(): Promise<IpListItem[]> {
    return this.prisma.ipWhitelistRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async listBlacklist(): Promise<IpBlacklistItem[]> {
    return this.prisma.ipBlacklistRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
