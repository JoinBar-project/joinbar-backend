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
 * 全域 Guard：ipWhitelistEnabled 開啟時，僅允許白名單中的 IP 存取。
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(
    private readonly featureFlags: FeatureFlagService,
    @Inject(IP_LIST_PORT) private readonly ipList: IpListPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.featureFlags.isEnabled('ipWhitelistEnabled')) return true;

    const ip = context.switchToHttp().getRequest<Request>().ip;
    if (!ip || !(await this.ipList.isWhitelisted(ip))) {
      throw new ForbiddenException('IP 位址不在白名單中');
    }
    return true;
  }
}
