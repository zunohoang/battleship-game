import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  clearRefreshCookie,
  getRefreshCookieName,
  setRefreshCookie,
} from './infrastructure/cookie.helper';
import type { AuthResponse } from './shared/auth-response.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } =
      await this.authService.register(dto);
    setRefreshCookie(res, refreshToken, this.configService);
    return { accessToken, user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } =
      await this.authService.login(dto);
    setRefreshCookie(res, refreshToken, this.configService);
    return { accessToken, user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const cookieName = getRefreshCookieName(this.configService);
    const refreshTokenCookie = (req.cookies as Record<string, string>)?.[
      cookieName
    ];
    if (!refreshTokenCookie) {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token not found',
      });
    }

    try {
      const { accessToken, refreshToken, user } =
        await this.authService.refresh(refreshTokenCookie);
      setRefreshCookie(res, refreshToken, this.configService);
      return { accessToken, user };
    } catch (error) {
      clearRefreshCookie(res, this.configService);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookieName = getRefreshCookieName(this.configService);
    const refreshTokenCookie = (req.cookies as Record<string, string>)?.[
      cookieName
    ];
    if (refreshTokenCookie) {
      await this.authService.revokeRefreshToken(refreshTokenCookie);
    }
    clearRefreshCookie(res, this.configService);
  }
}
