import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthFacade } from '../../../../application/facade/AuthFacade';
import { LoginResult } from '../../../../application/port/in/auth/LoginUseCase';
import { RefreshTokenResult } from '../../../../application/port/in/auth/RefreshTokenUseCase';
import { LineLoginResult } from '../../../../application/port/in/auth/LineLoginUseCase';
import { RegisterResult } from '../../../../application/port/in/auth/RegisterUseCase';
import { ZodValidationPipe } from '../../../../infrastructure/zod-validation.pipe';
import { Public } from '../decorator/public.decorator';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import { CurrentUser, UserContext } from '../decorator/current-user.decorator';
import { LoginRequest, loginSchema } from './dto/LoginRequest';
import { LogoutRequest, logoutSchema } from './dto/LogoutRequest';
import {
  RefreshTokenRequest,
  refreshTokenSchema,
} from './dto/RefreshTokenRequest';
import { LineLoginRequest, lineLoginSchema } from './dto/LineLoginRequest';
import { RegisterRequest, registerSchema } from './dto/RegisterRequest';
import {
  RequestPasswordResetRequest,
  requestPasswordResetSchema,
} from './dto/RequestPasswordResetRequest';
import {
  ConfirmPasswordResetRequest,
  confirmPasswordResetSchema,
} from './dto/ConfirmPasswordResetRequest';
import {
  VerifyEmailRequest,
  verifyEmailSchema,
} from './dto/VerifyEmailRequest';

@Controller('auth')
export class AuthController {
  constructor(private readonly authFacade: AuthFacade) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginRequest,
    @Req() req: Request,
  ): Promise<LoginResult> {
    return this.authFacade.login({
      email: dto.email,
      password: dto.password,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      recaptchaToken: dto.recaptchaToken,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutRequest,
    @Req() req: Request,
    @CurrentUser() actor: UserContext,
  ): Promise<void> {
    const accessToken = req.headers.authorization?.slice(7) ?? '';
    return this.authFacade.logout({
      accessToken,
      refreshToken: dto.refreshToken,
      email: actor.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenRequest,
    @Req() req: Request,
  ): Promise<RefreshTokenResult> {
    return this.authFacade.refreshToken({
      refreshToken: dto.refreshToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('line')
  @Public()
  @HttpCode(HttpStatus.OK)
  lineLogin(
    @Body(new ZodValidationPipe(lineLoginSchema)) dto: LineLoginRequest,
    @Req() req: Request,
  ): Promise<LineLoginResult> {
    return this.authFacade.lineLogin({
      code: dto.code,
      redirectUri: dto.redirectUri,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterRequest,
    @Req() req: Request,
  ): Promise<RegisterResult> {
    return this.authFacade.register({
      email: dto.email,
      password: dto.password,
      username: dto.username,
      ip: req.ip,
    });
  }

  @Post('password-reset/request')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetSchema))
    dto: RequestPasswordResetRequest,
    @Req() req: Request,
  ): Promise<void> {
    await this.authFacade.requestPasswordReset({
      email: dto.email,
      ip: req.ip,
    });
  }

  @Post('password-reset/confirm')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(confirmPasswordResetSchema))
    dto: ConfirmPasswordResetRequest,
  ): Promise<void> {
    await this.authFacade.confirmPasswordReset({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) dto: VerifyEmailRequest,
  ): Promise<void> {
    await this.authFacade.verifyEmail({ token: dto.token });
  }
}
