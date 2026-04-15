import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { AUTH_GRPC_CLIENT } from '../common/grpc/grpc.constants';

type ValidateTokenRequest = {
  access_token: string;
};

type ValidateTokenResponse = {
  valid: boolean;
  user_id: string;
  email: string;
  roles: string[];
};

type AuthGrpcServiceContract = {
  validateToken(payload: ValidateTokenRequest): Observable<ValidateTokenResponse>;
};

@Injectable()
export class GameAuthGrpcClientService implements OnModuleInit {
  private authGrpcService: AuthGrpcServiceContract | null = null;

  constructor(
    @Inject(AUTH_GRPC_CLIENT)
    private readonly authGrpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.authGrpcService = this.authGrpcClient.getService<AuthGrpcServiceContract>('AuthService');
  }

  async validateToken(
    accessToken: string,
  ): Promise<{ sub: string; email: string } | null> {
    if (!this.authGrpcService) {
      return null;
    }

    const response = await firstValueFrom(
      this.authGrpcService.validateToken({ access_token: accessToken }),
    );

    if (!response?.valid || !response.user_id) {
      return null;
    }

    return {
      sub: response.user_id,
      email: response.email,
    };
  }
}
