export interface DeleteUserCommand {
  userId: string;
}

export const DELETE_USER_USE_CASE = 'DELETE_USER_USE_CASE';

export interface DeleteUserUseCase {
  execute(command: DeleteUserCommand): Promise<void>;
}
