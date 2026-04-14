import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LlmBotShotRequestDto } from './dto/llm-bot.dto';
import { GameService } from './game.service';

@Controller('game/bot')
export class GameBotController {
  constructor(private readonly gameService: GameService) {}

  @Post('llm-shot')
  @UseGuards(JwtAuthGuard)
  suggestLlmShot(@Body() payload: LlmBotShotRequestDto) {
    return this.gameService.getLlmBotShot(payload);
  }
}
