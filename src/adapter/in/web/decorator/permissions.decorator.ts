import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../../../../domain/value-object/Role';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...codes: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
