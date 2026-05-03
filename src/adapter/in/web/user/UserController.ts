import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserFacade } from '../../../../application/facade/UserFacade';
import { ZodValidationPipe } from '../../../../infrastructure/zod-validation.pipe';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import { CurrentUser, UserContext } from '../decorator/current-user.decorator';
import { UpdateUserRequest, updateUserSchema } from './dto/UpdateUserRequest';
import {
  ChangePasswordRequest,
  changePasswordSchema,
} from './dto/ChangePasswordRequest';
import { UserProfileResponse } from './dto/UserProfileResponse';
import { AvatarResponse } from './dto/AvatarResponse';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userFacade: UserFacade) {}

  @Get('me')
  getProfile(@CurrentUser() actor: UserContext): Promise<UserProfileResponse> {
    return this.userFacade.getUser({ userId: actor.sub });
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() actor: UserContext,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserRequest,
  ): Promise<UserProfileResponse> {
    return this.userFacade.updateUser({
      userId: actor.sub,
      username: dto.username,
      nickname: dto.nickname,
      birthday: dto.birthday,
    });
  }

  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() actor: UserContext,
    @Body(new ZodValidationPipe(changePasswordSchema))
    dto: ChangePasswordRequest,
  ): Promise<void> {
    return this.userFacade.changePassword({
      userId: actor.sub,
      oldPassword: dto.oldPassword,
      newPassword: dto.newPassword,
    });
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser() actor: UserContext): Promise<void> {
    return this.userFacade.deleteUser({ userId: actor.sub });
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() actor: UserContext,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<AvatarResponse> {
    if (!file) throw new BadRequestException('請提供 file 欄位');
    if (!file.mimetype.startsWith('image/')) {
      throw new UnprocessableEntityException('檔案類型必須為圖片（image/*）');
    }

    return this.userFacade.updateAvatar({
      userId: actor.sub,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAvatar(@CurrentUser() actor: UserContext): Promise<void> {
    return this.userFacade.deleteAvatar({ userId: actor.sub });
  }
}
