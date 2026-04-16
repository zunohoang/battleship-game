import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../auth/domain/entities/user';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { IUserRepository } from '../auth/infrastructure/persistence/user.repository';
import { USER_REPOSITORY } from '../auth/infrastructure/persistence/user.repository';
import {
  PASSWORD_HASHER_REPOSITORY,
  type IPasswordHasherRepository,
} from '../auth/infrastructure/security/password-hasher.repository';
import {
  TOKEN_REPOSITORY,
  type ITokenRepository,
} from '../auth/infrastructure/security/token.repository';
import { AuthResponse } from '../auth/dto/auth-response.dto';
import type { ProfileSummaryDto } from './dto/profile-summary.dto';
import { existsSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CloudinaryService } from '../common/infrastructure/media/cloudinary.service';

@Injectable()
export class ProfileService {
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenService: ITokenRepository,
    @Inject(PASSWORD_HASHER_REPOSITORY)
    private readonly passwordHasher: IPasswordHasherRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    avatarUrl: string | null,
  ): Promise<AuthResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findByUsername(dto.username);
      if (existing && existing.id !== user.id) {
        throw new ConflictException({
          error: 'USERNAME_ALREADY_EXISTS',
          message: 'Username already exists',
        });
      }

      user.updateUsername(dto.username);
    }

    if (typeof dto.signature === 'string') {
      user.updateSignature(dto.signature);
    }

    if (avatarUrl) {
      this.deleteLocalAvatarIfExists(user.avatar);
      await this.deleteCloudinaryAvatarIfExists(user.avatar);
      user.updateAvatar(avatarUrl);
    }

    const savedUser = await this.userRepository.save(user);
    const token = await this.buildToken(savedUser);

    return {
      accessToken: token,
      user: savedUser.toPlainObject(),
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<AuthResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const currentOk = await this.passwordHasher.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      throw new UnauthorizedException({
        error: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException({
        error: 'NEW_PASSWORD_SAME_AS_OLD',
        message: 'New password must be different from the current password',
      });
    }

    const newHash = await this.passwordHasher.hash(dto.newPassword);
    user.updatePasswordHash(newHash);
    user.clearRefreshToken();

    const savedUser = await this.userRepository.save(user);
    const token = await this.buildToken(savedUser);

    return {
      accessToken: token,
      user: savedUser.toPlainObject(),
    };
  }

  async getProfileById(userId: string): Promise<ProfileSummaryDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      signature: user.signature,
      elo: user.elo,
      role: user.role,
    };
  }

  private async buildToken(user: User): Promise<string> {
    return this.tokenService.generate({
      sub: user.id,
      email: user.email,
    });
  }

  private deleteLocalAvatarIfExists(
    avatarUrl: string | null | undefined,
  ): void {
    if (!avatarUrl) {
      return;
    }

    const match = avatarUrl.match(/\/uploads\/([^/?#]+)/i);
    if (!match) {
      return;
    }

    const safeFilename = basename(match[1]);
    const targetPath = join(this.uploadDir, safeFilename);

    if (!existsSync(targetPath)) {
      return;
    }

    try {
      unlinkSync(targetPath);
    } catch {
      // Ignore file system deletion issues; profile update should still proceed.
    }
  }

  private async deleteCloudinaryAvatarIfExists(
    avatarUrl: string | null | undefined,
  ): Promise<void> {
    const publicId = this.cloudinaryService.extractPublicIdFromUrl(avatarUrl);
    if (!publicId) {
      return;
    }

    try {
      await this.cloudinaryService.destroy(publicId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete old Cloudinary avatar (${publicId})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
