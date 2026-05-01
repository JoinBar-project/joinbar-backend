export interface RequestPasswordResetCommand {
  email: string;
  /** 客戶端 IP */
  ip?: string;
}

export interface ConfirmPasswordResetCommand {
  token: string;
  newPassword: string;
}

export const REQUEST_PASSWORD_RESET_USE_CASE =
  'REQUEST_PASSWORD_RESET_USE_CASE';
export const CONFIRM_PASSWORD_RESET_USE_CASE =
  'CONFIRM_PASSWORD_RESET_USE_CASE';

export interface RequestPasswordResetUseCase {
  execute(command: RequestPasswordResetCommand): Promise<void>;
}

export interface ConfirmPasswordResetUseCase {
  execute(command: ConfirmPasswordResetCommand): Promise<void>;
}
