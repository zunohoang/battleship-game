import { MIN_ELO } from '../constants/elo.constants';

export { DEFAULT_STARTING_ELO } from '../constants/elo.constants';

/** K-factor by current rating (before the match): below 1000 → 40; 1000–1599 → 25; 1600+ → 15 */
export function kFactor(rating: number): number {
  if (rating < 1000) {
    return 40;
  }
  if (rating < 1600) {
    return 25;
  }
  return 15;
}

/** Expected score (probability of winning) for player A vs B. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function computeNewRatingsAfterWin(
  ratingWinner: number,
  ratingLoser: number,
): { newWinner: number; newLoser: number } {
  const eWinner = expectedScore(ratingWinner, ratingLoser);
  const eLoser = 1 - eWinner;
  const kW = kFactor(ratingWinner);
  const kL = kFactor(ratingLoser);
  const newWinner = Math.max(
    MIN_ELO,
    Math.round(ratingWinner + kW * (1 - eWinner)),
  );
  const newLoser = Math.max(
    MIN_ELO,
    Math.round(ratingLoser + kL * (0 - eLoser)),
  );
  return { newWinner, newLoser };
}
