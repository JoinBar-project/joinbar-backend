import { Inject, Injectable } from '@nestjs/common';
import {
  LOGIN_USE_CASE,
  LoginCommand,
  LoginResult,
  LoginUseCase,
} from '../port/in/auth/LoginUseCase';
import {
  LOGOUT_USE_CASE,
  LogoutCommand,
  LogoutUseCase,
} from '../port/in/auth/LogoutUseCase';
import {
  REFRESH_TOKEN_USE_CASE,
  RefreshTokenCommand,
  RefreshTokenResult,
  RefreshTokenUseCase,
} from '../port/in/auth/RefreshTokenUseCase';
import {
  LINE_LOGIN_USE_CASE,
  LineLoginCommand,
  LineLoginResult,
  LineLoginUseCase,
} from '../port/in/auth/LineLoginUseCase';
import {
  REGISTER_USE_CASE,
  RegisterCommand,
  RegisterResult,
  RegisterUseCase,
} from '../port/in/auth/RegisterUseCase';
import {
  CONFIRM_PASSWORD_RESET_USE_CASE,
  ConfirmPasswordResetCommand,
  ConfirmPasswordResetUseCase,
  REQUEST_PASSWORD_RESET_USE_CASE,
  RequestPasswordResetCommand,
  RequestPasswordResetUseCase,
} from '../port/in/auth/PasswordResetUseCase';
import {
  VERIFY_EMAIL_USE_CASE,
  VerifyEmailCommand,
  VerifyEmailUseCase,
} from '../port/in/auth/VerifyEmailUseCase';

/**
 * Auth ドメインの公開 API / Auth 領域的公開 API。
 * Controller はこの Facade 経由で全 use case を呼び出す。
 */
@Injectable()
export class AuthFacade {
  constructor(
    @Inject(LOGIN_USE_CASE) private readonly loginUseCase: LoginUseCase,
    @Inject(LOGOUT_USE_CASE) private readonly logoutUseCase: LogoutUseCase,
    @Inject(REFRESH_TOKEN_USE_CASE)
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    @Inject(LINE_LOGIN_USE_CASE)
    private readonly lineLoginUseCase: LineLoginUseCase,
    @Inject(REGISTER_USE_CASE)
    private readonly registerUseCase: RegisterUseCase,
    @Inject(REQUEST_PASSWORD_RESET_USE_CASE)
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    @Inject(CONFIRM_PASSWORD_RESET_USE_CASE)
    private readonly confirmPasswordResetUseCase: ConfirmPasswordResetUseCase,
    @Inject(VERIFY_EMAIL_USE_CASE)
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
  ) {}

  login(command: LoginCommand): Promise<LoginResult> {
    return this.loginUseCase.execute(command);
  }

  logout(command: LogoutCommand): Promise<void> {
    return this.logoutUseCase.execute(command);
  }

  refreshToken(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    return this.refreshTokenUseCase.execute(command);
  }

  lineLogin(command: LineLoginCommand): Promise<LineLoginResult> {
    return this.lineLoginUseCase.execute(command);
  }

  register(command: RegisterCommand): Promise<RegisterResult> {
    return this.registerUseCase.execute(command);
  }

  requestPasswordReset(command: RequestPasswordResetCommand): Promise<void> {
    return this.requestPasswordResetUseCase.execute(command);
  }

  confirmPasswordReset(command: ConfirmPasswordResetCommand): Promise<void> {
    return this.confirmPasswordResetUseCase.execute(command);
  }

  verifyEmail(command: VerifyEmailCommand): Promise<void> {
    return this.verifyEmailUseCase.execute(command);
  }
}
