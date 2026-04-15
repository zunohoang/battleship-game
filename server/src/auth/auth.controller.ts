import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './domain/entities/user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  clearRefreshCookie,
  getRefreshCookieName,
  setRefreshCookie,
} from './infrastructure/utils/cookie.util';

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

  @Post('bootstrap-admin')
  @HttpCode(HttpStatus.OK)
  async bootstrapAdmin(
    @Body() dto: BootstrapAdminDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } =
      await this.authService.bootstrapAdmin(dto);
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

  @Get('session')
  @UseGuards(JwtAuthGuard)
  getSession(@CurrentUser() user: User): { userId: string; role: string } {
    return { userId: user.id, role: user.role };
  }
}
