import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ITokenRepository, RefreshTokenPayload } from '../token.repository';
import type { StringValue } from 'ms';

@Injectable()
export class JwtTokenRepository implements ITokenRepository {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generate(payload: { sub: string; email: string }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.getOrThrow<StringValue>(
        'ACCESS_TOKEN_EXPIRES_IN',
      ),
    });
  }

  async validate(
    token: string,
  ): Promise<{ sub: string; email: string } | null> {
    try {
      const result = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(token);
      return result;
    } catch {
      return null;
    }
  }

  async generateRefreshToken(
    userId: string,
    email: string,
    absoluteExpiry: number,
  ): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      { sub: userId, email, jti, absoluteExpiry },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.configService.getOrThrow<StringValue>(
          'REFRESH_TOKEN_EXPIRES_IN',
        ),
      },
    );
    return { token, jti };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      return null;
    }
  }

  async decodeRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.getRefreshSecret(),
        ignoreExpiration: true,
      });
    } catch {
      return null;
    }
  }

  private getRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }
}
