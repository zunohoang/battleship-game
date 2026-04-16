import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/domain/entities/user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthResponse } from '../auth/dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import type { ProfileSummaryDto } from './dto/profile-summary.dto';
import { CloudinaryService } from '../common/infrastructure/media/cloudinary.service';

@Controller('users')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get(':id/profile')
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
      limits: {
        fileSize: 1024 * 1024 * 3,
      },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const isAllowed = allowed.includes(file.mimetype);
        cb(isAllowed ? null : new Error('INVALID_AVATAR_TYPE'), isAllowed);
      },
    }),
  )
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ): Promise<AuthResponse> {
    let avatarUrl: string | null = null;

    if (avatar) {
      const uploaded = await this.cloudinaryService.uploadImage(avatar, {
        folder: 'avatars',
        publicId: `user_${user.id}_${Date.now()}`,
      })
      avatarUrl = uploaded.secure_url;
    }

    return this.profileService.updateProfile(user.id, dto, avatarUrl);
  }
}
