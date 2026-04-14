import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/domain/entities/user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { BanUserDto } from './dto/ban-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.NO_CONTENT)
  async banUser(
    @CurrentUser() actor: User,
    @Param('userId') userId: string,
    @Body() dto: BanUserDto,
  ): Promise<void> {
    await this.adminService.banUser(actor, userId, dto);
  }
}
