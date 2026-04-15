import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TOKEN_REPOSITORY,
  type ITokenRepository,
} from '../auth/infrastructure/security/token.repository';
import { GameAuthGrpcClientService } from './game-auth-grpc-client.service';

@Injectable()
export class GameSocketAuthService {
  constructor(
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenRepository: ITokenRepository,
    private readonly configService: ConfigService,
    private readonly gameAuthGrpcClientService: GameAuthGrpcClientService,
  ) {}

  async validateAccessToken(
    accessToken: string,
  ): Promise<{ sub: string; email: string } | null> {
    if (this.shouldUseGrpcAuth()) {
      return this.gameAuthGrpcClientService.validateToken(accessToken);
    }

    return this.tokenRepository.validate(accessToken);
  }

  private shouldUseGrpcAuth(): boolean {
    const value = this.configService.get<string>('USE_GRPC_AUTH');
    if (typeof value !== 'string') {
      return true;
    }

    return value.trim().toLowerCase() === 'true';
  }
}
