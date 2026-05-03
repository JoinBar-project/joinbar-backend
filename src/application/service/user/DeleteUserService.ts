import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteUserCommand,
  DeleteUserUseCase,
} from '../../port/in/user/DeleteUserUseCase';
import {
  UPDATE_USER_PORT,
  UpdateUserPort,
} from '../../port/out/user/UpdateUserPort';
import {
  CLEAR_USER_CONTEXT_PORT,
  ClearUserContextPort,
} from '../../port/out/user/ClearUserContextPort';

@Injectable()
export class DeleteUserService implements DeleteUserUseCase {
  constructor(
    @Inject(UPDATE_USER_PORT) private readonly updateUser: UpdateUserPort,
    @Inject(CLEAR_USER_CONTEXT_PORT)
    private readonly clearUserContext: ClearUserContextPort,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    await this.updateUser.softDelete(command.userId);
    await this.clearUserContext.clearUserContext(command.userId);
  }
}
