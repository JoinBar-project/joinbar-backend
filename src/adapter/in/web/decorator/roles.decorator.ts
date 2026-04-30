import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../../../domain/value-object/Role';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
