import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../auth/domain/entities/user';
import type { AuthResponse } from '../auth/shared/auth-response.interface';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { IUserRepository } from '../auth/infrastructure/persistence/user.repository';
import { USER_REPOSITORY } from '../auth/infrastructure/persistence/user.repository';
import type { ITokenService } from '../auth/infrastructure/token.service';
import { TOKEN_SERVICE } from '../auth/infrastructure/token.service';
import type { IPasswordHasher } from '../auth/infrastructure/password-hasher';
import { PASSWORD_HASHER } from '../auth/infrastructure/password-hasher';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
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
