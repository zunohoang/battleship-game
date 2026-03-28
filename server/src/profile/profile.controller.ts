import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/domain/entities/user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthResponse } from '../auth/dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import type { ProfileSummaryDto } from './dto/profile-summary.dto';

@Controller('users')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param('id') id: string): Promise<ProfileSummaryDto> {
    return this.profileService.getProfileById(id);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<AuthResponse> {
    return this.profileService.changePassword(user.id, dto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }

          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 3,
      },
    }),
  )
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @Req() request: Request,
    @UploadedFile() avatar?: Express.Multer.File,
  ): Promise<AuthResponse> {
    const avatarUrl = avatar
      ? `${request.protocol}://${request.get('host')}/uploads/${avatar.filename}`
      : null;

    return this.profileService.updateProfile(user.id, dto, avatarUrl);
  }
}
