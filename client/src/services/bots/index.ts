import { EasyBot } from "@/services/bots/easyBot";
import { HardBot } from "@/services/bots/hardBot";
import type { GameBot } from "@/services/bots/types";

export type BotDifficulty = "easy" | "hard";

export function createBot(difficulty: BotDifficulty): GameBot {
    if (difficulty === "hard") {
        return new HardBot();
    }

    return new EasyBot();
}

export { EasyBot, HardBot };
export type { BotTarget, BotTurnContext, BotShotResult, GameBot } from "@/services/bots/types";
