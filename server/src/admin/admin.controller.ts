import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/domain/entities/user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminArchivePostDto } from './dto/admin-archive-post.dto';
import { AdminForceFinishMatchDto } from './dto/admin-force-finish-match.dto';
import { AdminRoomBanUserActionDto } from './dto/admin-room-ban-user-action.dto';
import { AdminMatchesQueryDto } from './dto/admin-matches-query.dto';
import { AdminModerationQueryDto } from './dto/admin-moderation-query.dto';
import { AdminOverviewQueryDto } from './dto/admin-overview-query.dto';
import { AdminRoomActionDto } from './dto/admin-room-action.dto';
import { AdminRoomUserActionDto } from './dto/admin-room-user-action.dto';
import { AdminRoomsQueryDto } from './dto/admin-rooms-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { BanUserDto } from './dto/ban-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/overview')
  getOverview(
    @CurrentUser() actor: User,
    @Query() query: AdminOverviewQueryDto,
  ) {
    return this.adminService.getOverview(actor, query);
  }

  @Get('game/rooms')
  listRooms(@CurrentUser() actor: User, @Query() query: AdminRoomsQueryDto) {
    return this.adminService.listRooms(actor, query);
  }

  @Get('game/matches')
  listMatches(@CurrentUser() actor: User, @Query() query: AdminMatchesQueryDto) {
    return this.adminService.listMatches(actor, query);
  }

  @Post('game/rooms/:roomId/force-close')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forceCloseRoom(
    @CurrentUser() actor: User,
    @Param('roomId') roomId: string,
    @Body() dto: AdminRoomActionDto,
  ): Promise<void> {
    await this.adminService.forceCloseRoom(actor, roomId, dto.reason);
  }

  @Post('game/matches/:matchId/force-finish')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forceFinishMatch(
    @CurrentUser() actor: User,
    @Param('matchId') matchId: string,
    @Body() dto: AdminForceFinishMatchDto,
  ): Promise<void> {
    await this.adminService.forceFinishMatch(actor, matchId, dto);
  }

  @Post('game/rooms/:roomId/force-win')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forceWinInRoom(
    @CurrentUser() actor: User,
    @Param('roomId') roomId: string,
    @Body() dto: AdminRoomUserActionDto,
  ): Promise<void> {
    await this.adminService.forceWinInRoom(actor, roomId, dto.userId, dto.reason);
  }

  @Post('game/rooms/:roomId/kick-user')
  @HttpCode(HttpStatus.NO_CONTENT)
  async kickUserFromRoom(
    @CurrentUser() actor: User,
    @Param('roomId') roomId: string,
    @Body() dto: AdminRoomUserActionDto,
  ): Promise<void> {
    await this.adminService.kickUserFromRoom(actor, roomId, dto.userId, dto.reason);
  }

  @Post('game/rooms/:roomId/ban-user')
  @HttpCode(HttpStatus.NO_CONTENT)
  async banUserInRoom(
    @CurrentUser() actor: User,
    @Param('roomId') roomId: string,
    @Body() dto: AdminRoomBanUserActionDto,
  ): Promise<void> {
    await this.adminService.banUserInRoom(actor, roomId, dto.userId, dto);
  }

  @Get('forum/moderation/queue')
  listModerationQueue(
    @CurrentUser() actor: User,
    @Query() query: AdminModerationQueryDto,
  ) {
    return this.adminService.listModerationQueue(actor, query);
  }

  @Post('forum/posts/:postId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveForumPost(
    @CurrentUser() actor: User,
    @Param('postId') postId: string,
    @Body() dto: AdminArchivePostDto,
  ): Promise<void> {
    await this.adminService.archiveForumPost(actor, postId, dto.reason);
  }

  @Delete('forum/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForumComment(
    @CurrentUser() actor: User,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.adminService.deleteForumComment(actor, commentId);
  }

  @Get('users')
  listUsers(@CurrentUser() actor: User, @Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(actor, query);
  }

  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.NO_CONTENT)
  async banUser(
    @CurrentUser() actor: User,
    @Param('userId') userId: string,
    @Body() dto: BanUserDto,
  ): Promise<void> {
    await this.adminService.banUser(actor, userId, dto);
  }

  @Post('users/:userId/unban')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbanUser(
    @CurrentUser() actor: User,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.adminService.unbanUser(actor, userId);
  }

  @Post('users/:userId/grant-moderator')
  @HttpCode(HttpStatus.NO_CONTENT)
  async grantModeratorRole(
    @CurrentUser() actor: User,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.adminService.grantModeratorRole(actor, userId);
  }

  @Post('users/:userId/revoke-moderator')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeModeratorRole(
    @CurrentUser() actor: User,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.adminService.revokeModeratorRole(actor, userId);
  }

  @Get('audit-logs')
  listAuditLogs(
    @CurrentUser() actor: User,
    @Query() query: AdminAuditQueryDto,
  ) {
    return this.adminService.listAuditLogs(actor, query);
  }
}
