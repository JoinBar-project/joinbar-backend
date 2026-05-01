import { Module } from '@nestjs/common';
import { JwtModule } from './jwt.module';
import { AuthController } from '../adapter/in/web/auth/AuthController';
import { AuthFacade } from '../application/facade/AuthFacade';
import { LoginService } from '../application/service/auth/LoginService';
import { LogoutService } from '../application/service/auth/LogoutService';
import { RefreshTokenService } from '../application/service/auth/RefreshTokenService';
import { LineLoginService } from '../application/service/auth/LineLoginService';
import { RegisterService } from '../application/service/auth/RegisterService';
import { RequestPasswordResetService } from '../application/service/auth/RequestPasswordResetService';
import { ConfirmPasswordResetService } from '../application/service/auth/ConfirmPasswordResetService';
import { VerifyEmailService } from '../application/service/auth/VerifyEmailService';
import { PasswordPolicyService } from '../application/service/PasswordPolicyService';
import { PrismaUserRepository } from '../adapter/out/persistence/user/PrismaUserRepository';
import { PrismaPasswordResetTokenRepository } from '../adapter/out/persistence/auth/PrismaPasswordResetTokenRepository';
import { LineOAuthAdapter } from '../adapter/out/line-auth/LineOAuthAdapter';
import { LOGIN_USE_CASE } from '../application/port/in/auth/LoginUseCase';
import { LOGOUT_USE_CASE } from '../application/port/in/auth/LogoutUseCase';
import { REFRESH_TOKEN_USE_CASE } from '../application/port/in/auth/RefreshTokenUseCase';
import { LINE_LOGIN_USE_CASE } from '../application/port/in/auth/LineLoginUseCase';
import { REGISTER_USE_CASE } from '../application/port/in/auth/RegisterUseCase';
import {
  CONFIRM_PASSWORD_RESET_USE_CASE,
  REQUEST_PASSWORD_RESET_USE_CASE,
} from '../application/port/in/auth/PasswordResetUseCase';
import { VERIFY_EMAIL_USE_CASE } from '../application/port/in/auth/VerifyEmailUseCase';
import { FIND_USER_PORT } from '../application/port/out/user/FindUserPort';
import { SAVE_USER_PORT } from '../application/port/out/user/SaveUserPort';
import { LOAD_USER_CONTEXT_PORT } from '../application/port/out/user/LoadUserContextPort';
import { PASSWORD_RESET_TOKEN_PORT } from '../application/port/out/auth/PasswordResetTokenPort';
import { LINE_OAUTH_PORT } from '../application/port/out/auth/LineOAuthPort';

@Module({
  imports: [JwtModule],
  controllers: [AuthController],
  providers: [
    // ─── Persistence Adapters ─────────────────────────────────────────
    // PrismaUserRepository は FindUserPort / SaveUserPort / LoadUserContextPort を実装
    PrismaUserRepository,
    { provide: FIND_USER_PORT, useExisting: PrismaUserRepository },
    { provide: SAVE_USER_PORT, useExisting: PrismaUserRepository },
    { provide: LOAD_USER_CONTEXT_PORT, useExisting: PrismaUserRepository },
    PrismaPasswordResetTokenRepository,
    {
      provide: PASSWORD_RESET_TOKEN_PORT,
      useExisting: PrismaPasswordResetTokenRepository,
    },
    // ─── External Service Adapters ────────────────────────────────────
    LineOAuthAdapter,
    { provide: LINE_OAUTH_PORT, useExisting: LineOAuthAdapter },
    // ─── Domain Services ──────────────────────────────────────────────
    // 以下 Global Module からの提供（宣告不要）：
    //   TOKEN_BLACKLIST_PORT, CLEAR_USER_CONTEXT_PORT, SESSION_ACTIVITY_PORT  → RedisModule
    //   IP_BLOCK_PORT                                                         → RedisModule
    //   SAVE_AUTH_LOG_PORT                                                    → AuthLogModule
    //   ACCOUNT_LOCK_PORT, IP_LIST_PORT                                       → SecurityModule
    //   SEND_EMAIL_PORT                                                        → EmailModule
    //   RECAPTCHA_VERIFY_PORT                                                  → RecaptchaModule
    //   FeatureFlagService                                                     → FeatureFlagModule
    PasswordPolicyService,
    // ─── Application Services ──────────────────────────────────────────
    LoginService,
    { provide: LOGIN_USE_CASE, useExisting: LoginService },
    LogoutService,
    { provide: LOGOUT_USE_CASE, useExisting: LogoutService },
    RefreshTokenService,
    { provide: REFRESH_TOKEN_USE_CASE, useExisting: RefreshTokenService },
    LineLoginService,
    { provide: LINE_LOGIN_USE_CASE, useExisting: LineLoginService },
    RegisterService,
    { provide: REGISTER_USE_CASE, useExisting: RegisterService },
    RequestPasswordResetService,
    {
      provide: REQUEST_PASSWORD_RESET_USE_CASE,
      useExisting: RequestPasswordResetService,
    },
    ConfirmPasswordResetService,
    {
      provide: CONFIRM_PASSWORD_RESET_USE_CASE,
      useExisting: ConfirmPasswordResetService,
    },
    VerifyEmailService,
    { provide: VERIFY_EMAIL_USE_CASE, useExisting: VerifyEmailService },
    // ─── Facade ───────────────────────────────────────────────────────
    AuthFacade,
  ],
  // LOAD_USER_CONTEXT_PORT を export → JwtAuthGuard が他モジュールでも使用可能
  exports: [LOAD_USER_CONTEXT_PORT, AuthFacade],
})
export class AuthModule {}
