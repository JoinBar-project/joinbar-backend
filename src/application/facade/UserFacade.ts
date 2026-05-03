import { Inject, Injectable } from '@nestjs/common';
import {
  GET_USER_USE_CASE,
  GetUserCommand,
  GetUserResult,
  GetUserUseCase,
} from '../port/in/user/GetUserUseCase';
import {
  UPDATE_USER_USE_CASE,
  UpdateUserCommand,
  UpdateUserResult,
  UpdateUserUseCase,
} from '../port/in/user/UpdateUserUseCase';
import {
  CHANGE_PASSWORD_USE_CASE,
  ChangePasswordCommand,
  ChangePasswordUseCase,
} from '../port/in/user/ChangePasswordUseCase';
import {
  DELETE_USER_USE_CASE,
  DeleteUserCommand,
  DeleteUserUseCase,
} from '../port/in/user/DeleteUserUseCase';
import {
  UPDATE_AVATAR_USE_CASE,
  UpdateAvatarCommand,
  UpdateAvatarResult,
  UpdateAvatarUseCase,
} from '../port/in/user/UpdateAvatarUseCase';
import {
  DELETE_AVATAR_USE_CASE,
  DeleteAvatarCommand,
  DeleteAvatarUseCase,
} from '../port/in/user/DeleteAvatarUseCase';

/**
 * User ドメインの公開 API / User 領域的公開 API。
 * Controller はこの Facade 経由で全 use case を呼び出す。
 */
@Injectable()
export class UserFacade {
  constructor(
    @Inject(GET_USER_USE_CASE)
    private readonly getUserUseCase: GetUserUseCase,
    @Inject(UPDATE_USER_USE_CASE)
    private readonly updateUserUseCase: UpdateUserUseCase,
    @Inject(CHANGE_PASSWORD_USE_CASE)
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    @Inject(DELETE_USER_USE_CASE)
    private readonly deleteUserUseCase: DeleteUserUseCase,
    @Inject(UPDATE_AVATAR_USE_CASE)
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
    @Inject(DELETE_AVATAR_USE_CASE)
    private readonly deleteAvatarUseCase: DeleteAvatarUseCase,
  ) {}

  getUser(command: GetUserCommand): Promise<GetUserResult> {
    return this.getUserUseCase.execute(command);
  }

  updateUser(command: UpdateUserCommand): Promise<UpdateUserResult> {
    return this.updateUserUseCase.execute(command);
  }

  changePassword(command: ChangePasswordCommand): Promise<void> {
    return this.changePasswordUseCase.execute(command);
  }

  deleteUser(command: DeleteUserCommand): Promise<void> {
    return this.deleteUserUseCase.execute(command);
  }

  updateAvatar(command: UpdateAvatarCommand): Promise<UpdateAvatarResult> {
    return this.updateAvatarUseCase.execute(command);
  }

  deleteAvatar(command: DeleteAvatarCommand): Promise<void> {
    return this.deleteAvatarUseCase.execute(command);
  }
}
