import { Injectable } from '@nestjs/common';
import { GameAuthGrpcClientService } from './game-auth-grpc-client.service';

@Injectable()
export class GameSocketAuthService {
  constructor(
    private readonly gameAuthGrpcClientService: GameAuthGrpcClientService,
  ) {}

  async validateAccessToken(
    accessToken: string,
  ): Promise<{ sub: string; email: string } | null> {
    return this.gameAuthGrpcClientService.validateToken(accessToken);
  }
}
