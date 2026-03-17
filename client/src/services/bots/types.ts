import type { BoardConfig } from '@/types/game';

export type BotShotResult = 'hit' | 'miss';

export interface BotTarget {
    x: number;
    y: number;
}

export interface BotTurnContext {
    boardConfig: BoardConfig;
    attemptedShots: ReadonlySet<string>;
}

export interface GameBot {
    readonly name: string;
    pickTarget(context: BotTurnContext): BotTarget | null;
}
