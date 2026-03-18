import type { BotTarget } from '@/services/bots/types';
import {
  parseCellKey,
  randomPick,
  toCellKey,
} from '@/services/bots/core/shared/boardUtils';

export function scoreCandidates(
  candidates: readonly BotTarget[],
  baseHeatMap: ReadonlyMap<string, number>,
  bonusFn: (target: BotTarget) => number,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const target of candidates) {
    const key = toCellKey(target.x, target.y);
    const base = baseHeatMap.get(key) ?? 0;
    scores.set(key, base + bonusFn(target));
  }

  return scores;
}

export function pickBestTarget(
  scoreByCell: ReadonlyMap<string, number>,
  fallback: readonly BotTarget[],
): BotTarget {
  if (scoreByCell.size === 0) {
    return randomPick(fallback);
  }

  let bestScore = Number.NEGATIVE_INFINITY;
  const bestKeys: string[] = [];

  for (const [key, score] of scoreByCell.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestKeys.length = 0;
      bestKeys.push(key);
      continue;
    }

    if (score === bestScore) {
      bestKeys.push(key);
    }
  }

  return parseCellKey(randomPick(bestKeys));
}
