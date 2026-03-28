import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/domain/entities/user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchHistoryQueryDto } from './dto/match-history-query.dto';
import { GameService } from './game.service';

@Controller('game')
export class GameHistoryController {
  constructor(private readonly gameService: GameService) {}

  @Get('matches/history')
  @UseGuards(JwtAuthGuard)
  listMatchHistory(
    @CurrentUser() user: User,
    @Query() query: MatchHistoryQueryDto,
  ) {
    return this.gameService.listOnlineMatchHistory(user.id, query.limit ?? 20);
  }
}
