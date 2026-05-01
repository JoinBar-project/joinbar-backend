export interface RegisterCommand {
  email: string;
  password: string;
  username: string;
  /** 客戶端 IP */
  ip?: string;
}

export interface RegisterResult {
  /** emailVerificationEnabled=true 時為 false，需完成驗證 */
  verified: boolean;
}

export const REGISTER_USE_CASE = 'REGISTER_USE_CASE';

export interface RegisterUseCase {
  execute(command: RegisterCommand): Promise<RegisterResult>;
}
