import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { JwtModule } from './jwt.module';
import { StorageModule } from './storage.module';
import { UserController } from '../adapter/in/web/user/UserController';
import { UserFacade } from '../application/facade/UserFacade';
import { GetUserService } from '../application/service/user/GetUserService';
import { UpdateUserService } from '../application/service/user/UpdateUserService';
import { ChangePasswordService } from '../application/service/user/ChangePasswordService';
import { DeleteUserService } from '../application/service/user/DeleteUserService';
import { UpdateAvatarService } from '../application/service/user/UpdateAvatarService';
import { DeleteAvatarService } from '../application/service/user/DeleteAvatarService';
import { PasswordPolicyService } from '../application/service/PasswordPolicyService';
import { PrismaUserRepository } from '../adapter/out/persistence/user/PrismaUserRepository';
import { GET_USER_USE_CASE } from '../application/port/in/user/GetUserUseCase';
import { UPDATE_USER_USE_CASE } from '../application/port/in/user/UpdateUserUseCase';
import { CHANGE_PASSWORD_USE_CASE } from '../application/port/in/user/ChangePasswordUseCase';
import { DELETE_USER_USE_CASE } from '../application/port/in/user/DeleteUserUseCase';
import { UPDATE_AVATAR_USE_CASE } from '../application/port/in/user/UpdateAvatarUseCase';
import { DELETE_AVATAR_USE_CASE } from '../application/port/in/user/DeleteAvatarUseCase';
import { FIND_USER_PORT } from '../application/port/out/user/FindUserPort';
import { SAVE_USER_PORT } from '../application/port/out/user/SaveUserPort';
import { UPDATE_USER_PORT } from '../application/port/out/user/UpdateUserPort';

@Module({
  imports: [AuthModule, JwtModule, StorageModule],
  controllers: [UserController],
  providers: [
    // ─── Persistence Adapter ─────────────────────────────────────────
    // PrismaUserRepository は FindUserPort / SaveUserPort / UpdateUserPort を実装
    PrismaUserRepository,
    { provide: FIND_USER_PORT, useExisting: PrismaUserRepository },
    { provide: SAVE_USER_PORT, useExisting: PrismaUserRepository },
    { provide: UPDATE_USER_PORT, useExisting: PrismaUserRepository },
    // ─── Domain Services ─────────────────────────────────────────────
    PasswordPolicyService,
    // ─── Application Services ────────────────────────────────────────
    GetUserService,
    { provide: GET_USER_USE_CASE, useExisting: GetUserService },
    UpdateUserService,
    { provide: UPDATE_USER_USE_CASE, useExisting: UpdateUserService },
    ChangePasswordService,
    { provide: CHANGE_PASSWORD_USE_CASE, useExisting: ChangePasswordService },
    DeleteUserService,
    { provide: DELETE_USER_USE_CASE, useExisting: DeleteUserService },
    UpdateAvatarService,
    { provide: UPDATE_AVATAR_USE_CASE, useExisting: UpdateAvatarService },
    DeleteAvatarService,
    { provide: DELETE_AVATAR_USE_CASE, useExisting: DeleteAvatarService },
    // ─── Facade ──────────────────────────────────────────────────────
    UserFacade,
  ],
})
export class UserModule {}
