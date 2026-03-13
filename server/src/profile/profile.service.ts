import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../auth/domain/entities/user';
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

@Injectable()
export class ProfileService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenService: ITokenRepository,
    @Inject(PASSWORD_HASHER_REPOSITORY)
    private readonly passwordHasher: IPasswordHasherRepository,
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

    if (dto.password) {
      const newHash = await this.passwordHasher.hash(dto.password);
      user.updatePasswordHash(newHash);
      user.clearRefreshToken();
    }

    if (avatarUrl) {
      user.updateAvatar(avatarUrl);
    }

    const savedUser = await this.userRepository.save(user);
    const token = await this.buildToken(savedUser);

    return {
      accessToken: token,
      user: savedUser.toPlainObject(),
    };
  }

  private async buildToken(user: User): Promise<string> {
    return this.tokenService.generate({
      sub: user.id,
      email: user.email,
    });
  }
}
