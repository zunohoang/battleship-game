import type { BotTarget, BotTurnContext } from '@/services/bots/types';
import { toCellKey } from '@/services/bots/core/shared/boardUtils';

export function buildAvailableTargets(context: BotTurnContext): BotTarget[] {
  const targets: BotTarget[] = [];
  const { rows, cols } = context.boardConfig;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = toCellKey(x, y);
      if (!context.attemptedShots.has(key)) {
        targets.push({ x, y });
      }
    }
  }

  return targets;
}

export function filterParityCells(
  candidates: readonly BotTarget[],
  parity = 0,
): BotTarget[] {
  return candidates.filter((cell) => (cell.x + cell.y) % 2 === parity);
}
