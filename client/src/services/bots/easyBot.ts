import type { BotTarget, BotTurnContext, GameBot } from '@/services/bots/types';
import { cellKey } from '@/utils/placementUtils';

function buildAvailableTargets(context: BotTurnContext): BotTarget[] {
  const targets: BotTarget[] = [];

  for (let y = 0; y < context.boardConfig.rows; y += 1) {
    for (let x = 0; x < context.boardConfig.cols; x += 1) {
      const key = cellKey(x, y);
      if (!context.attemptedShots.has(key)) {
        targets.push({ x, y });
      }
    }
  }

  return targets;
}

export class EasyBot implements GameBot {
  readonly name = 'EasyBot';

  pickTarget(context: BotTurnContext): BotTarget | null {
    const availableTargets = buildAvailableTargets(context);
    if (availableTargets.length === 0) return null;

    return availableTargets[Math.floor(Math.random() * availableTargets.length)];
  }
}
