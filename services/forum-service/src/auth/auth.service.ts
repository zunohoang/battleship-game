import { createHash } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from './domain/entities/user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { IUserRepository } from './infrastructure/persistence/user.repository';
import { USER_REPOSITORY } from './infrastructure/persistence/user.repository';
import {
  PASSWORD_HASHER_REPOSITORY,
  type IPasswordHasherRepository,
} from './infrastructure/security/password-hasher.repository';
import { AuthUser } from './dto/auth-response.dto';
import {
  TOKEN_REPOSITORY,
  type ITokenRepository,
} from './infrastructure/security/token.repository';

export interface AuthServiceResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenService: ITokenRepository,
    @Inject(PASSWORD_HASHER_REPOSITORY)
    private readonly passwordHasher: IPasswordHasherRepository,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthServiceResult> {
    const existingByEmail = await this.userRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already exists',
      });
    }

    const existingByUsername = await this.userRepository.findByUsername(
      dto.username,
    );
    if (existingByUsername) {
      throw new ConflictException({
        error: 'USERNAME_ALREADY_EXISTS',
        message: 'Username already exists',
      });
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = new User({
      email: dto.email,
      username: dto.username,
      passwordHash,
    });

    return this.issueTokenPair(user);
  }

  async login(dto: LoginDto): Promise<AuthServiceResult> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const isValidPassword = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    return this.issueTokenPair(user);
  }

  /**
   * Validates the refresh token, enforces absolute lifetime, detects reuse,
   * rotates the refresh token, and issues a new access token.
   */
  async refresh(refreshTokenJwt: string): Promise<AuthServiceResult> {
    const payload = await this.tokenService.verifyRefreshToken(refreshTokenJwt);
    if (!payload) {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    if (Date.now() >= payload.absoluteExpiry) {
      throw new UnauthorizedException({
        error: 'REFRESH_TOKEN_ABSOLUTE_EXPIRED',
        message: 'Session has expired, please log in again',
      });
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    const incomingHash = createHash('sha256').update(payload.jti).digest('hex');
    if (user.refreshTokenHash !== incomingHash) {
      // Reuse detected — invalidate the session as a security measure
      user.clearRefreshToken();
      await this.userRepository.save(user);
      throw new UnauthorizedException({
        error: 'REFRESH_TOKEN_REUSED',
        message: 'Refresh token already used',
      });
    }

    // Pass the same absoluteExpiry so the 180-day ceiling survives rotation
    return this.issueTokenPair(user, payload.absoluteExpiry);
  }

  /**
   * Revokes the refresh session associated with the given token.
   * Uses ignoreExpiration so logout works even if the 30-day window lapsed.
   */
  async revokeRefreshToken(refreshTokenJwt: string): Promise<void> {
    const payload = await this.tokenService.decodeRefreshToken(refreshTokenJwt);
    if (!payload) return;

    const user = await this.userRepository.findById(payload.sub);
    if (!user) return;

    const incomingHash = createHash('sha256').update(payload.jti).digest('hex');
    if (user.refreshTokenHash === incomingHash) {
      user.clearRefreshToken();
      await this.userRepository.save(user);
    }
  }

  async validateUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  /**
   * Creates a new access + refresh token pair, updates the user's stored
   * refresh token hash, and persists before returning.
   */
  private async issueTokenPair(
    user: User,
    absoluteExpiry?: number,
  ): Promise<AuthServiceResult> {
    const expiry =
      absoluteExpiry ?? Date.now() + this.getRefreshAbsoluteTtlMs();

    const { token: refreshToken, jti } =
      await this.tokenService.generateRefreshToken(user.id, user.email, expiry);

    const jtiHash = createHash('sha256').update(jti).digest('hex');
    user.setRefreshToken(jtiHash, expiry);

    const savedUser = await this.userRepository.save(user);
    const accessToken = await this.tokenService.generate({
      sub: savedUser.id,
      email: savedUser.email,
    });

    return { accessToken, refreshToken, user: savedUser.toPlainObject() };
  }

  private getRefreshAbsoluteTtlMs(): number {
    const daysText = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_ABSOLUTE_TTL_DAYS',
    );
    const days = Number(daysText);
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error(
        'REFRESH_TOKEN_ABSOLUTE_TTL_DAYS must be a positive number',
      );
    }

    return days * 24 * 60 * 60 * 1000;
  }
}
