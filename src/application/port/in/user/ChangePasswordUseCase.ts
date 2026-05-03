export interface ChangePasswordCommand {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

export const CHANGE_PASSWORD_USE_CASE = 'CHANGE_PASSWORD_USE_CASE';

export interface ChangePasswordUseCase {
  execute(command: ChangePasswordCommand): Promise<void>;
}
