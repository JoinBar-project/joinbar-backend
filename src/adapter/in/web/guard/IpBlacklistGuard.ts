import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { FeatureFlagService } from '../../../../application/service/FeatureFlagService';
import {
  IP_LIST_PORT,
  IpListPort,
} from '../../../../application/port/out/security/IpListPort';

/**
 * 全域 Guard：ipBlacklistEnabled 開啟時，拒絕黑名單 IP 的請求。
 */
@Injectable()
export class IpBlacklistGuard implements CanActivate {
  constructor(
    private readonly featureFlags: FeatureFlagService,
    @Inject(IP_LIST_PORT) private readonly ipList: IpListPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.featureFlags.isEnabled('ipBlacklistEnabled')) return true;

    const ip = context.switchToHttp().getRequest<Request>().ip;
    if (ip && (await this.ipList.isBlacklisted(ip))) {
      throw new ForbiddenException('IP 位址已被封鎖');
    }
    return true;
  }
}
