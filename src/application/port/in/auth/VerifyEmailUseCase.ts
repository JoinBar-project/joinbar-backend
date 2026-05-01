export interface VerifyEmailCommand {
  token: string;
}

export const VERIFY_EMAIL_USE_CASE = 'VERIFY_EMAIL_USE_CASE';

export interface VerifyEmailUseCase {
  execute(command: VerifyEmailCommand): Promise<void>;
}
