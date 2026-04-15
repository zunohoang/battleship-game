import { Controller, Inject, UnauthorizedException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  TOKEN_REPOSITORY,
  type ITokenRepository,
} from './infrastructure/security/token.repository';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from './infrastructure/persistence/user.repository';

type ValidateTokenRequest = {
  access_token?: string;
};

type ValidateTokenResponse = {
  valid: boolean;
  user_id: string;
  email: string;
  roles: string[];
};

type GetUserByIdRequest = {
  user_id?: string;
};

type GetUserByIdResponse = {
  user_id: string;
  email: string;
  username: string;
  active: boolean;
};

@Controller()
export class AuthGrpcController {
  constructor(
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenRepository: ITokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    request: ValidateTokenRequest,
  ): Promise<ValidateTokenResponse> {
    const token = request?.access_token?.trim();
    if (!token) {
      return this.invalidToken();
    }

    const payload = await this.tokenRepository.validate(token);
    if (!payload) {
      return this.invalidToken();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      return this.invalidToken();
    }

    return {
      valid: true,
      user_id: user.id,
      email: user.email,
      roles: ['user'],
    };
  }

  @GrpcMethod('AuthService', 'GetUserById')
  async getUserById(request: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    const userId = request?.user_id?.trim();
    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      user_id: user.id,
      email: user.email,
      username: user.username,
      active: true,
    };
  }

  private invalidToken(): ValidateTokenResponse {
    return {
      valid: false,
      user_id: '',
      email: '',
      roles: [],
    };
  }
}
