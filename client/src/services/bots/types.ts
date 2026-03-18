import type { BoardConfig } from '@/types/game';

export type BotShotResult = 'hit' | 'miss';

export interface BotTarget {
  x: number;
  y: number;
}
export interface BotShot {
  x: number;
  y: number;
  isHit: boolean;
  shipInstanceKey?: string;
  didSink?: boolean;
  sunkShipSize?: number;
}
export interface BotTurnContext {
  boardConfig: BoardConfig;
  attemptedShots: ReadonlySet<string>;

  shots?: readonly BotShot[];
  shipSizes?: readonly number[];
  remainingShipSizes?: readonly number[];
  lastShot?: BotShot;
}

export interface GameBot {
  readonly name: string;
  pickTarget(context: BotTurnContext): BotTarget | null;
}
